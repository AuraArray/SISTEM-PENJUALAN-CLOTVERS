/**
 * CLOTHVERSH SYSTEM LIGHT CORE - SYSTEMS MOTOR ENGINE LOGIC
 */

let db;
const dbName = "ClothvershDB";
let trendChartInstance = null;
let pieChartInstance = null;

// Initialize Database Object Stores Architecture
const dbRequest = indexedDB.open(dbName, 3);

dbRequest.onupgradeneeded = function(e) {
    db = e.target.result;
    const structures = {
        "store_produk": "id",
        "store_hpp": "id_hpp",
        "store_transaksi": "id_transaksi",
        "store_jurnal_akuntansi": "id_jurnal",
        "store_retur_reject": "id_retur"
    };
    for (const [storeName, key] of Object.entries(structures)) {
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: key, autoIncrement: true });
        }
    }
};

dbRequest.onsuccess = function(e) {
    db = e.target.result;
    initSystemCoreHooks();
};

function getPeriodeFilterGlobal() {
    return {
        bulan: document.getElementById("filter-bulan").value,
        tahun: document.getElementById("filter-tahun").value
    };
}

function initSystemCoreHooks() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("pos-tgl-order").value = today;
    document.getElementById("pos-tgl-po").value = today;

    // Filter Change Event Binding
    document.getElementById("filter-bulan").addEventListener("change", refreshAllDashboardsData);
    document.getElementById("filter-tahun").addEventListener("change", refreshAllDashboardsData);
    document.getElementById("finance-filter-tipe").addEventListener("change", renderFinanceDashboard);

    // Live Math Engines Event Allocation
    document.querySelectorAll(".input-calc-hpp").forEach(input => {
        input.addEventListener("input", calculateLiveHPPFormEngine);
    });

    document.getElementById("pos-qty").addEventListener("input", calculateLivePOSPriceMatrix);
    document.getElementById("pos-diskon").addEventListener("input", calculateLivePOSPriceMatrix);
    document.getElementById("pos-ongkir").addEventListener("input", calculateLivePOSPriceMatrix);
    document.getElementById("pos-dp").addEventListener("input", calculateLivePOSPriceMatrix);
    document.getElementById("pos-status-bayar").addEventListener("change", calculateLivePOSPriceMatrix);
    document.getElementById("pos-produk-varian").addEventListener("change", calculateLivePOSPriceMatrix);
    document.getElementById("pos-platform").addEventListener("change", calculateLivePOSPriceMatrix);

    refreshAllDashboardsData();
}

function refreshAllDashboardsData() {
    renderStokDashboard();
    renderHPPDashboard();
    renderPOSDashboard();
    renderAnalyticsDashboard();
    renderReturDashboard();
    renderFinanceDashboard();
}

// --- NAVIGATION SYSTEMS ---
function switchTab(target) {
    ['stok', 'hpp', 'pos', 'analytics', 'retur', 'finance'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.add('hidden');
        if(document.getElementById(`btn-nav-${t}`)) document.getElementById(`btn-nav-${t}`).classList.remove('active-nav');
        if(document.getElementById(`btn-m-nav-${t}`)) {
            document.getElementById(`btn-m-nav-${t}`).className = "flex flex-col items-center text-[10px] font-bold text-gray-400";
        }
    });
    document.getElementById(`panel-${target}`).classList.remove('hidden');
    if(document.getElementById(`btn-nav-${target}`)) document.getElementById(`btn-nav-${target}`).classList.add('active-nav');
    if(document.getElementById(`btn-m-nav-${target}`)) {
        document.getElementById(`btn-m-nav-${target}`).className = "flex flex-col items-center text-[10px] font-bold text-[#396399]";
    }
    const titles = { stok: 'Input Stok Pakaian', hpp: 'Manajemen HPP & Harga Jual', pos: 'Terminal POS Kasir', analytics: 'Rekap & Grafik Analisis', retur: 'Modul Retur & Cacat', finance: 'Akuntansi & Keuangan' };
    document.getElementById("current-tab-title").innerText = titles[target];
    
    if(target === 'analytics') { setTimeout(initChartsRenderEngine, 100); }
}

// --- DASHBOARD A: MULTIVARIAN COMPLEX STOK LOGIC ---
function tambahBarisWarnaKompleks() {
    const container = document.getElementById("matrix-warna-container");
    const div = document.createElement("div");
    div.className = "p-2.5 bg-[#f5f5f7] rounded-xl space-y-2 warna-block mt-2";
    div.innerHTML = `
        <input type="text" placeholder="Nama Warna (Misal: Putih)" class="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-bold input-warna-nama" required>
        <div class="grid grid-cols-4 gap-1 text-[10px] font-semibold text-gray-500 text-center border-b border-gray-200 pb-1">
            <div>Size</div><div>Stok</div><div>HPP</div><div>Jual</div>
        </div>
        <div class="space-y-1 size-matrix-rows">
            ${['S', 'M', 'L', 'XL'].map(sz => `
                <div class="grid grid-cols-4 gap-1 items-center" data-size="${sz}">
                    <span class="font-bold text-center">${sz}</span>
                    <input type="number" value="0" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-stok">
                    <input type="number" value="0" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-hpp">
                    <input type="number" value="0" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-jual">
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(div);
}

document.getElementById("form-stok").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("stok-id").value;
    const matriks_varian = [];

    document.querySelectorAll(".warna-block").forEach(block => {
        const warna = block.querySelector(".input-warna-nama").value.trim();
        if(warna) {
            block.querySelectorAll(".size-matrix-rows > div").forEach(row => {
                const size = row.getAttribute("data-size");
                const stok = parseInt(row.querySelector(".size-stok").value) || 0;
                const hpp_varian = parseFloat(row.querySelector(".size-hpp").value) || 0;
                const jual_varian = parseFloat(row.querySelector(".size-jual").value) || 0;
                matriks_varian.push({ warna, size, stok, hpp_varian, jual_varian });
            });
        }
    });

    const payload = {
        nama_model: document.getElementById("stok-nama").value,
        jenis_kain: document.getElementById("stok-kain").value,
        tipe_kain_gsm: document.getElementById("stok-gsm").value,
        detail_produksi: document.getElementById("stok-detail").value,
        wh: parseInt(document.getElementById("stok-wh").value) || 0,
        ht: parseInt(document.getElementById("stok-ht").value) || 0,
        tb: parseInt(document.getElementById("stok-tb").value) || 0,
        bb: parseInt(document.getElementById("stok-bb").value) || 0,
        matriks_varian
    };

    const tx = db.transaction(["store_produk"], "readwrite");
    if(id) { payload.id = parseInt(id); tx.objectStore("store_produk").put(payload); }
    else { tx.objectStore("store_produk").add(payload); }

    tx.oncomplete = function() {
        document.getElementById("form-stok").reset();
        document.getElementById("stok-id").value = "";
        document.getElementById("matrix-warna-container").innerHTML = `
            <div class="p-2.5 bg-[#f5f5f7] rounded-xl space-y-2 warna-block">
                <input type="text" placeholder="Nama Warna (Misal: Hitam)" class="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-bold input-warna-nama" required>
                <div class="grid grid-cols-4 gap-1 text-[10px] font-semibold text-gray-500 text-center border-b border-gray-200 pb-1">
                    <div>Size</div><div>Stok</div><div>HPP</div><div>Jual</div>
                </div>
                <div class="space-y-1 size-matrix-rows">
                    ${['S', 'M', 'L', 'XL'].map(sz => `
                        <div class="grid grid-cols-4 gap-1 items-center" data-size="${sz}">
                            <span class="font-bold text-center">${sz}</span>
                            <input type="number" value="0" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-stok">
                            <input type="number" value="0" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-hpp">
                            <input type="number" value="0" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-jual">
                        </div>
                    `).join('')}
                </div>
            </div>`;
        refreshAllDashboardsData();
    };
});

function renderStokDashboard() {
    const tbody = document.getElementById("table-stok");
    tbody.innerHTML = "";
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const tr = document.createElement("tr");
            tr.className = "border-b border-gray-100 text-xs hover:bg-gray-50/50";
            
            let matrixHTML = "";
            v.matriks_varian.forEach((mv, index) => {
                matrixHTML += `
                    <div class="bg-white border border-gray-200 p-1.5 rounded-xl text-[10px] space-y-0.5 flex flex-col w-28">
                        <span class="font-bold text-[#396399]">${mv.warna} (${mv.size})</span>
                        <div class="flex items-center gap-1">
                            <span class="text-[9px] text-gray-400">Stok:</span>
                            <input type="number" value="${mv.stok}" onchange="updateStockOpnameDirect(${v.id}, ${index}, this.value)" class="w-full bg-gray-50 border border-gray-200 font-mono text-center text-amber-700 font-bold rounded">
                        </div>
                        <span class="text-[9px] text-gray-500">H: ${mv.hpp_varian.toLocaleString()}</span>
                        <span class="text-[9px] text-green-600 font-semibold">J: ${mv.jual_varian.toLocaleString()}</span>
                    </div>`;
            });

            tr.innerHTML = `
                <td class="py-3 pr-2 font-bold text-gray-900">
                    ${v.nama_model}<br>
                    <span class="text-[10px] font-mono text-gray-400 font-medium">${v.jenis_kain} (${v.tipe_kain_gsm}) [WH:${v.wh} HT:${v.ht}]</span>
                </td>
                <td class="py-3"><div class="flex flex-wrap gap-1 max-w-xl">${matrixHTML}</div></td>
                <td class="py-3 text-right space-x-1 whitespace-nowrap">
                    <button onclick="editStokMaster(${v.id})" class="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200">Edit</button>
                    <button onclick="deleteStokMaster(${v.id})" class="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function updateStockOpnameDirect(id, index, value) {
    const tx = db.transaction(["store_produk"], "readwrite");
    const store = tx.objectStore("store_produk");
    store.get(id).onsuccess = function(e) {
        const item = e.target.result;
        if(item) {
            item.matriks_varian[index].stok = parseInt(value) || 0;
            store.put(item);
        }
    };
}

function deleteStokMaster(id) {
    if(confirm("Hapus berkas model produk pakaian ini dari inventory master?")) {
        db.transaction(["store_produk"], "readwrite").objectStore("store_produk").delete(id).onsuccess = () => refreshAllDashboardsData();
    }
}

function editStokMaster(id) {
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(id).onsuccess = function(e) {
        const v = e.target.result;
        if(!v) return;
        document.getElementById("stok-id").value = v.id;
        document.getElementById("stok-nama").value = v.nama_model;
        document.getElementById("stok-kain").value = v.jenis_kain;
        document.getElementById("stok-gsm").value = v.tipe_kain_gsm;
        document.getElementById("stok-detail").value = v.detail_produksi || "";
        document.getElementById("stok-wh").value = v.wh;
        document.getElementById("stok-ht").value = v.ht;
        document.getElementById("stok-tb").value = v.tb;
        document.getElementById("stok-bb").value = v.bb;

        const container = document.getElementById("matrix-warna-container");
        container.innerHTML = "";

        let grouped = {};
        v.matriks_varian.forEach(mv => {
            if(!grouped[mv.warna]) grouped[mv.warna] = [];
            grouped[mv.warna].push(mv);
        });

        for (const [warna, arrays] of Object.entries(grouped)) {
            const div = document.createElement("div");
            div.className = "p-2.5 bg-[#f5f5f7] rounded-xl space-y-2 warna-block";
            div.innerHTML = `
                <input type="text" value="${warna}" class="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-bold input-warna-nama" required>
                <div class="grid grid-cols-4 gap-1 text-[10px] font-semibold text-gray-500 text-center border-b border-gray-200 pb-1">
                    <div>Size</div><div>Stok</div><div>HPP</div><div>Jual</div>
                </div>
                <div class="space-y-1 size-matrix-rows">
                    ${arrays.map(mv => `
                        <div class="grid grid-cols-4 gap-1 items-center" data-size="${mv.size}">
                            <span class="font-bold text-center">${mv.size}</span>
                            <input type="number" value="${mv.stok}" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-stok">
                            <input type="number" value="${mv.hpp_varian}" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-hpp">
                            <input type="number" value="${mv.jual_varian}" class="bg-white border border-gray-200 rounded p-0.5 text-center text-xs size-jual">
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(div);
        }
    };
}

// --- DASHBOARD B: MANAJEMEN HPP FORMULA ---
function calculateLiveHPPFormEngine() {
    const kain = parseFloat(document.getElementById("hpp-kain").value) || 0;
    const jahit = parseFloat(document.getElementById("hpp-jahit").value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-sablon").value) || 0;
    const pack = parseFloat(document.getElementById("hpp-pack").value) || 0;
    const margin = parseFloat(document.getElementById("hpp-margin").value) || 0;

    const totalHPP = kain + jahit + sablon + pack;
    const hargaDasar = totalHPP + (totalHPP * (margin / 100));

    document.getElementById("live-hpp-total").innerText = "Rp " + totalHPP.toLocaleString();
    document.getElementById("live-harga-dasar").innerText = "Rp " + hargaDasar.toLocaleString();
}

document.getElementById("form-hpp").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("hpp-id").value;
    const kain = parseFloat(document.getElementById("hpp-kain").value) || 0;
    const jahit = parseFloat(document.getElementById("hpp-jahit").value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-sablon").value) || 0;
    const pack = parseFloat(document.getElementById("hpp-pack").value) || 0;
    const margin = parseFloat(document.getElementById("hpp-margin").value) || 0;
    
    const hpp_total = kain + jahit + sablon + pack;
    const hargaDasar = hpp_total + (hpp_total * (margin / 100));

    const channels = ['wa', 'shopee', 'tiktok', 'reseller'];
    const pChannels = {};
    channels.forEach(ch => {
        let pct = parseFloat(document.getElementById(`adm-${ch}`).value) || 0;
        pChannels[ch] = Math.round(hargaDasar / (1 - (pct / 100)));
    });

    const payload = {
        nama_model: document.getElementById("hpp-nama").value, biaya_kain: kain, ongkos_jahit: jahit,
        aplikasi_sablon: sablon, packaging: pack, margin_percent: margin, hpp_total, harga_jual_channels: pChannels
    };

    const tx = db.transaction(["store_hpp"], "readwrite");
    if(id) { payload.id_hpp = parseInt(id); tx.objectStore("store_hpp").put(payload); }
    else { tx.objectStore("store_hpp").add(payload); }

    tx.oncomplete = () => { document.getElementById("form-hpp").reset(); document.getElementById("hpp-id").value=""; refreshAllDashboardsData(); };
});

function renderHPPDashboard() {
    const tbody = document.getElementById("table-hpp");
    tbody.innerHTML = "";
    db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const tr = document.createElement("tr");
            tr.className = "border-b border-gray-100 text-xs";
            tr.innerHTML = `
                <td class="py-3 font-bold text-gray-900">${v.nama_model}</td>
                <td class="py-3 font-mono text-gray-500">Rp ${v.hpp_total.toLocaleString()}</td>
                <td class="py-3 font-mono space-y-0.5">
                    <span class="block text-[#396399]">WA Retail: Rp ${v.harga_jual_channels.wa.toLocaleString()}</span>
                    <span class="block text-orange-600">Shopee: Rp ${v.harga_jual_channels.shopee.toLocaleString()}</span>
                    <span class="block text-pink-600">TikTok: Rp ${v.harga_jual_channels.tiktok.toLocaleString()}</span>
                    <span class="block text-blue-600">Reseller B2B: Rp ${v.harga_jual_channels.reseller.toLocaleString()}</span>
                </td>
                <td class="py-3 text-right space-x-1 whitespace-nowrap">
                    <button onclick="editHPPEngine(${v.id_hpp})" class="px-2 py-1 bg-gray-100 rounded-md">Edit</button>
                    <button onclick="deleteHPPEngine(${v.id_hpp})" class="px-2 py-1 bg-red-50 text-red-600 rounded-md">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function editHPPEngine(id) {
    db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").get(id).onsuccess = function(e) {
        const v = e.target.result;
        if(!v) return;
        document.getElementById("hpp-id").value = v.id_hpp;
        document.getElementById("hpp-nama").value = v.nama_model;
        document.getElementById("hpp-kain").value = v.biaya_kain;
        document.getElementById("hpp-jahit").value = v.ongkos_jahit;
        document.getElementById("hpp-sablon").value = v.aplikasi_sablon;
        document.getElementById("hpp-pack").value = v.packaging;
        document.getElementById("hpp-margin").value = v.margin_percent;
        calculateLiveHPPFormEngine();
    };
}

function deleteHPPEngine(id) {
    if(confirm("Hapus rekam log komponen pembentuk HPP ini?")) {
        db.transaction(["store_hpp"], "readwrite").objectStore("store_hpp").delete(id).onsuccess = () => refreshAllDashboardsData();
    }
}

// --- TERMINAL POS KASIR SYSTEM ---
function renderPOSDashboard() {
    const select = document.getElementById("pos-produk-varian");
    select.innerHTML = '<option value="">-- Hubungkan Item Varian --</option>';
    
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const p = cursor.value;
            p.matriks_varian.forEach((mv, idx) => {
                if(mv.stok > 0) {
                    let opt = document.createElement("option");
                    opt.value = `${p.id}|${mv.warna}|${mv.size}|${idx}|${mv.jual_varian}`;
                    opt.innerText = `${p.nama_model} - ${mv.warna} (${mv.size}) [Price: Rp ${mv.jual_varian.toLocaleString()}]`;
                    select.appendChild(opt);
                }
            });
            cursor.continue();
        }
    };
    renderPOSLogTableRegister();
}

function calculateLivePOSPriceMatrix() {
    const val = document.getElementById("pos-produk-varian").value;
    if(!val) return;
    const [, , , , jualVarian] = val.split("|");
    const qty = parseInt(document.getElementById("pos-qty").value) || 1;
    const diskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
    const ongkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
    const dp = parseFloat(document.getElementById("pos-dp").value) || 0;
    const status = document.getElementById("pos-status-bayar").value;

    let basePrice = parseFloat(jualVarian) || 0;
    let grandTotal = (basePrice * qty) - diskon + ongkir;
    if(grandTotal < 0) grandTotal = 0;

    let sisa = 0;
    if(status === 'Lunas') { document.getElementById("pos-dp").value = 0; sisa = 0; }
    else { sisa = grandTotal - dp; }

    document.getElementById("pos-sisa").value = sisa < 0 ? 0 : sisa;
}

document.getElementById("form-pos").addEventListener("submit", function(e) {
    e.preventDefault();
    const val = document.getElementById("pos-produk-varian").value;
    if(!val) return alert("Pilih produk varian terlebih dahulu!");

    const [pId, warna, size, matrixIdx, jualVarian] = val.split("|");
    const qty = parseInt(document.getElementById("pos-qty").value);
    const platform = document.getElementById("pos-platform").value;
    const status_bayar = document.getElementById("pos-status-bayar").value;
    const dp = parseFloat(document.getElementById("pos-dp").value) || 0;
    const sisa = parseFloat(document.getElementById("pos-sisa").value) || 0;
    const tglOrder = document.getElementById("pos-tgl-order").value;
    const pTime = getPeriodeFilterGlobal();

    const tx = db.transaction(["store_produk", "store_transaksi", "store_jurnal_akuntansi"], "readwrite");
    
    tx.objectStore("store_produk").get(parseInt(pId)).onsuccess = function(ev) {
        const prod = ev.target.result;
        if(prod.matriks_varian[matrixIdx].stok < qty) {
            return alert("Batal! Stok di sistem tidak memadai.");
        }
        
        prod.matriks_varian[matrixIdx].stok -= qty;
        tx.objectStore("store_produk").put(prod);

        let unitPrice = parseFloat(jualVarian) || 0;
        let diskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
        let ongkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
        let grand = (unitPrice * qty) - diskon + ongkir;

        const trx = {
            tanggal_order: tglOrder, tanggal_selesai_po: document.getElementById("pos-tgl-po").value,
            produk_id: parseInt(pId), varian_warna: warna, varian_size: size, qty, grand_total: grand,
            diskon, ongkir, ekspedisi: document.getElementById("pos-kurir-resi").value, platform_order: platform,
            metode_bayar: document.getElementById("pos-metode").value, status_bayar, jumlah_dp: dp, sisa_tagihan: sisa,
            timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun, nama_produk: prod.nama_model
        };
        tx.objectStore("store_transaksi").add(trx);

        let cashReceived = status_bayar === 'Lunas' ? grand : dp;
        if(cashReceived > 0) {
            tx.objectStore("store_jurnal_akuntansi").add({
                tanggal: tglOrder, tipe_jurnal: "POS", klasifikasi_akun: "Pendapatan POS Kasir",
                nominal: cashReceived, keterangan_memo: `[POS Sales] ${prod.nama_model} (${warna}/${size}) x ${qty}`,
                timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun
            });
        }
    };

    tx.oncomplete = () => { document.getElementById("form-pos").reset(); initSystemCoreHooks(); };
});

function renderPOSLogTableRegister() {
    const tbody = document.getElementById("table-pos-log");
    tbody.innerHTML = "";
    const pTime = getPeriodeFilterGlobal();

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 text-xs";
                tr.innerHTML = `
                    <td class="py-2 font-mono font-bold">#CVS-${v.id_transaksi}</td>
                    <td><b>${v.nama_produk}</b><br><span class="text-[10px] text-gray-400">${v.varian_warna} / ${v.varian_size} via ${v.platform_order}</span></td>
                    <td class="font-mono font-bold text-gray-900">Rp ${v.grand_total.toLocaleString()}</td>
                    <td><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status_bayar==='Lunas'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}">${v.status_bayar}</span></td>
                    <td class="text-right whitespace-nowrap">
                        <button onclick="bukaPopUpStrukThermalVertikal(${v.id_transaksi})" class="px-2 py-0.5 bg-[#396399] text-white font-bold rounded-lg text-[10px]">Struk</button>
                        <button onclick="hapusPOSLogRegister(${v.id_transaksi})" class="text-red-600 ml-1 hover:underline">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

function hapusPOSLogRegister(id) {
    if(confirm("Hapus rekam log kasir ini?")) {
        db.transaction(["store_transaksi"], "readwrite").objectStore("store_transaksi").delete(id).onsuccess = () => refreshAllDashboardsData();
    }
}

function bukaPopUpStrukThermalVertikal(id) {
    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").get(id).onsuccess = function(e) {
        const v = e.target.result;
        if(!v) return;
        document.getElementById("thermal-print-area").innerHTML = `
            <div style="text-align:center; font-weight:bold; font-size:12px;">CLOTHVERSH SYSTEM</div>
            <div style="text-align:center; font-size:9px; color:#555;">Apple-Style Apparel Platform</div>
            <div style="border-top:1px dashed #000; margin:6px 0;"></div>
            <div>Nota ID: #CVS-${v.id_transaksi}</div>
            <div>Tanggal: ${v.tanggal_order}</div>
            <div>Platform: ${v.platform_order}</div>
            <div style="border-top:1px dashed #000; margin:6px 0;"></div>
            <div style="font-weight:bold;">${v.nama_produk}</div>
            <div>Varian: ${v.varian_warna} (${v.varian_size}) x ${v.qty}</div>
            <div style="border-top:1px dashed #000; margin:6px 0;"></div>
            <div style="display:flex; justify-content:space-between;"><span>Diskon:</span><span>Rp ${v.diskon.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Ongkir:</span><span>Rp ${v.ongkir.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>Grand Total:</span><span>Rp ${v.grand_total.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; color:#396399;"><span>DP Masuk:</span><span>Rp ${v.jumlah_dp.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:red;"><span>Sisa Tagihan:</span><span>Rp ${v.sisa_tagihan.toLocaleString()}</span></div>
            <div style="border-top:1px dashed #000; margin:6px 0;"></div>
            <div style="text-align:center; font-size:9px; margin-top:4px;">Terima Kasih Atas Kunjungan Anda</div>
        `;
        document.getElementById("modal-receipt-view").classList.remove("hidden");
    };
}

// --- DASHBOARD D: REKAPAN & VISUALISASI GRAFIK ---
function renderAnalyticsDashboard() {
    const pTime = getPeriodeFilterGlobal();
    let totalPcs = 0;
    let modelMap = {};
    let platformMap = { "WhatsApp": 0, "Shopee": 0, "TikTok": 0, "Reseller": 0, "Grosir": 0 };
    let timelineMap = {};

    const table = document.querySelector("#panel-analytics table");
    // Clear dynamic rows except headers
    const rows = table.querySelectorAll("tr");
    for(let i=1; i<rows.length; i++) rows[i].remove();

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                totalPcs += v.qty;
                modelMap[v.nama_produk] = (modelMap[v.nama_produk] || 0) + v.qty;
                
                if(platformMap[v.platform_order] !== undefined) {
                    platformMap[v.platform_order] += v.grand_total;
                }

                timelineMap[v.tanggal_order] = (timelineMap[v.tanggal_order] || 0) + v.qty;

                // Append row to Detail Rekapan Barang Terjual
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 text-xs text-gray-700 hover:bg-gray-50";
                tr.innerHTML = `
                    <td class="py-2">${v.tanggal_order}</td>
                    <td class="font-bold text-gray-900">${v.nama_produk}</td>
                    <td>${v.varian_warna}</td>
                    <td>${v.varian_size}</td>
                    <td>${v.qty} Pcs</td>
                    <td><span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium">${v.platform_order}</span></td>
                    <td class="text-right font-mono font-bold">Rp ${v.grand_total.toLocaleString()}</td>
                `;
                table.appendChild(tr);
            }
            cursor.continue();
        } else {
            // Widget Processing
            document.getElementById("widget-total-pcs").innerText = totalPcs + " Pcs";
            
            let topModel = "-";
            let maxModel = 0;
            for(let m in modelMap) { if(modelMap[m] > maxModel) { maxModel = modelMap[m]; topModel = m; } }
            document.getElementById("widget-top-model").innerText = topModel;

            let topPlat = "-";
            let maxPlat = -1;
            for(let p in platformMap) { if(platformMap[p] > maxPlat && platformMap[p] > 0) { maxPlat = platformMap[p]; topPlat = p; } }
            document.getElementById("widget-top-platform").innerText = topPlat;

            // Injeksi update chart data jika modul sedang terbuka
            updateChartInstances(timelineMap, platformMap);
        }
    };
}

function initChartsRenderEngine() {
    const ctxTrend = document.getElementById('chart-tren-penjualan');
    const ctxPie = document.getElementById('chart-pie-platform');
    if(!ctxTrend || !ctxPie) return;

    if(trendChartInstance) trendChartInstance.destroy();
    if(pieChartInstance) pieChartInstance.destroy();

    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Volume Terjual (Pcs)', data: [], borderColor: '#396399', backgroundColor: 'rgba(57, 99, 153, 0.05)', fill: true, tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: { labels: ['WhatsApp', 'Shopee', 'TikTok', 'Reseller', 'Grosir'], datasets: [{ data: [0,0,0,0,0], backgroundColor: ['#396399', '#f97316', '#ec4899', '#3b82f6', '#10b981'] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    refreshAllDashboardsData();
}

function updateChartInstances(timeline, platforms) {
    if(!trendChartInstance || !pieChartInstance) return;
    
    // Update Timeline Line Chart
    const sortedDates = Object.keys(timeline).sort();
    trendChartInstance.data.labels = sortedDates;
    trendChartInstance.data.datasets[0].data = sortedDates.map(d => timeline[d]);
    trendChartInstance.update();

    // Update Platform Doughnut Chart
    pieChartInstance.data.datasets[0].data = [
        platforms["WhatsApp"] || 0,
        platforms["Shopee"] || 0,
        platforms["TikTok"] || 0,
        platforms["Reseller"] || 0,
        platforms["Grosir"] || 0
    ];
    pieChartInstance.update();
}

// --- MODUL E: MANAGEMENT RETUR & CAKUT (REJECT) ---
function renderReturDashboard() {
    // Sync Dropdown Options from Store Master Produk
    const select = document.getElementById("retur-model-select");
    select.innerHTML = '<option value="">-- Hubungkan Berkas Master --</option>';
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            let opt = document.createElement("option");
            opt.value = cursor.value.nama_model; opt.innerText = cursor.value.nama_model;
            select.appendChild(opt);
            cursor.continue();
        }
    };

    const tbody = document.getElementById("table-retur-log");
    tbody.innerHTML = "";
    db.transaction(["store_retur_reject"], "readonly").objectStore("store_retur_reject").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const tr = document.createElement("tr");
            tr.className = "border-b border-gray-100 text-xs";
            tr.innerHTML = `
                <td class="py-2">${v.tanggal}</td>
                <td><span class="px-2 py-0.5 font-bold rounded text-[10px] ${v.jenis==='Tukar Size'?'bg-blue-50 text-blue-700':'bg-red-50 text-red-700'}">${v.jenis}</span></td>
                <td><b>${v.nama_model}</b><br><span class="text-[10px] text-gray-400">${v.warna} / Size: ${v.size} -> ${v.size_baru || '-'}</span></td>
                <td>${v.qty} Pcs</td>
                <td class="text-right font-mono text-red-600 font-bold">Rp ${v.nominal_rugi.toLocaleString()}</td>
                <td class="text-right"><button onclick="hapusLogReturReject(${v.id_retur})" class="text-red-500 hover:underline">Hapus</button></td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

document.getElementById("form-retur").addEventListener("submit", function(e) {
    e.preventDefault();
    const jenis = document.getElementById("retur-jenis").value;
    const model = document.getElementById("retur-model-select").value;
    const warna = document.getElementById("retur-warna").value;
    const size = document.getElementById("retur-size").value;
    const qty = parseInt(document.getElementById("retur-qty").value);
    const sizeBaru = document.getElementById("retur-size-baru").value;
    const ket = document.getElementById("retur-keterangan").value;
    const pTime = getPeriodeFilterGlobal();
    const today = new Date().toISOString().split('T')[0];

    const tx = db.transaction(["store_produk", "store_retur_reject", "store_jurnal_akuntansi"], "readwrite");
    
    // Find item matching logic manually from model name
    tx.objectStore("store_produk").openCursor().onsuccess = function(ev) {
        const cursor = ev.target.result;
        if(cursor) {
            const prod = cursor.value;
            if(prod.nama_model === model) {
                let matchedHpp = 0;
                prod.matriks_varian.forEach(mv => {
                    if(mv.warna.toLowerCase() === warna.toLowerCase() && mv.size.toLowerCase() === size.toLowerCase()) {
                        matchedHpp = mv.hpp_varian;
                    }
                });

                if(jenis === "Tukar Size") {
                    // Balikkan stok lama, kurangi stok baru
                    prod.matriks_varian.forEach(mv => {
                        if(mv.warna.toLowerCase() === warna.toLowerCase()) {
                            if(mv.size.toLowerCase() === size.toLowerCase()) mv.stok += qty;
                            if(mv.size.toLowerCase() === sizeBaru.toLowerCase()) mv.stok -= qty;
                        }
                    });
                } else {
                    // Cacat Produksi (Reject) -> Potong stok permanen
                    prod.matriks_varian.forEach(mv => {
                        if(mv.warna.toLowerCase() === warna.toLowerCase() && mv.size.toLowerCase() === size.toLowerCase()) {
                            mv.stok -= qty;
                        }
                    });
                    // Kerugian otomatis dilempar ke jurnal Akuntansi
                    let totalRugi = matchedHpp * qty;
                    tx.objectStore("store_jurnal_akuntansi").add({
                        tanggal: today, tipe_jurnal: "Pengeluaran", klasifikasi_akun: "Kerugian Barang Reject",
                        nominal: totalRugi, keterangan_memo: `[Otomatis Reject] ${model} (${warna}/${size}) x ${qty} Pcs. Memo: ${ket}`,
                        timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun
                    });
                }
                
                tx.objectStore("store_produk").put(prod);
                tx.objectStore("store_retur_reject").add({
                    tanggal: today, jenis, nama_model: model, warna, size, qty, size_baru: sizeBaru,
                    keterangan: ket, nominal_rugi: jenis === "Cacat Produksi" ? (matchedHpp * qty) : 0, timestamp: Date.now()
                });
                return;
            }
            cursor.continue();
        }
    };

    tx.oncomplete = () => { document.getElementById("form-retur").reset(); refreshAllDashboardsData(); };
});

function hapusLogReturReject(id) {
    if(confirm("Hapus log rekam masalah ini?")) {
        db.transaction(["store_retur_reject"], "readwrite").objectStore("store_retur_reject").delete(id).onsuccess = () => refreshAllDashboardsData();
    }
}

// --- PEROMBAKAN TOTAL FINANSIAL AKUNTANSI SYSTEM ---
function switchFinanceSubTab(target) {
    ['sub-penjualan', 'sub-pengeluaran', 'sub-masuk'].forEach(sub => {
        document.getElementById(`panel-${sub}`).classList.add('hidden');
        document.getElementById(`btn-${sub}`).className = "px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-900";
    });
    document.getElementById(`panel-${target}`).classList.remove('hidden');
    document.getElementById(`btn-${target}`).className = "px-4 py-2 text-xs font-bold border-b-2 border-[#396399] text-gray-900";
}

document.getElementById("form-jurnal-keluar").addEventListener("submit", function(e) {
    e.preventDefault();
    postManualAccountingJournalEntry("Pengeluaran", "jurnal-keluar-akun", "jurnal-keluar-nominal", "jurnal-keluar-memo");
});

document.getElementById("form-jurnal-masuk").addEventListener("submit", function(e) {
    e.preventDefault();
    postManualAccountingJournalEntry("Uang Masuk", "jurnal-masuk-akun", "jurnal-masuk-nominal", "jurnal-masuk-memo");
});

function postManualAccountingJournalEntry(type, elAkun, elNominal, elMemo) {
    const pTime = getPeriodeFilterGlobal();
    const today = new Date().toISOString().split('T')[0];
    const payload = {
        tanggal: today, tipe_jurnal: type, klasifikasi_akun: document.getElementById(elAkun).value,
        nominal: parseFloat(document.getElementById(elNominal).value) || 0,
        keterangan_memo: document.getElementById(elMemo).value,
        timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun
    };
    db.transaction(["store_jurnal_akuntansi"], "readwrite").objectStore("store_jurnal_akuntansi").add(payload).oncomplete = () => {
        document.getElementById(elNominal).value = ""; document.getElementById(elMemo).value = "";
        refreshAllDashboardsData();
    };
}

function renderFinanceDashboard() {
    const pTime = getPeriodeFilterGlobal();
    const filterTipe = document.getElementById("finance-filter-tipe").value; // bulan / hari / tahun
    const todayStr = new Date().toISOString().split('T')[0];

    let omsetPOS = 0, totalBeban = 0, totalDanaMasukLuar = 0;

    const tPenjualan = document.getElementById("table-fin-penjualan");
    const tKeluar = document.getElementById("table-jurnal-keluar");
    const tMasuk = document.getElementById("table-jurnal-masuk");
    
    tPenjualan.innerHTML = ""; tKeluar.innerHTML = ""; tMasuk.innerHTML = "";

    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            let passFilter = false;

            if (filterTipe === 'bulan' && v.bulan === pTime.bulan && v.tahun === pTime.tahun) passFilter = true;
            else if (filterTipe === 'hari' && v.tanggal === todayStr) passFilter = true;
            else if (filterTipe === 'tahun' && v.tahun === pTime.tahun) passFilter = true;

            if(passFilter) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 text-xs text-gray-700 hover:bg-gray-50";

                if(v.tipe_jurnal === "POS") {
                    omsetPOS += v.nominal;
                    tr.innerHTML = `<td>${v.tanggal}</td><td><b>POS System</b></td><td>${v.keterangan_memo}</td><td class="text-right font-mono font-bold text-green-700">Rp ${v.nominal.toLocaleString()}</td>`;
                    tPenjualan.appendChild(tr);
                } else if(v.tipe_jurnal === "Pengeluaran") {
                    totalBeban += v.nominal;
                    tr.innerHTML = `<td>${v.tanggal}</td><td class="text-red-600 font-semibold">${v.klasifikasi_akun}</td><td>${v.keterangan_memo}</td><td class="text-right font-mono">Rp ${v.nominal.toLocaleString()}</td><td class="text-right"><button onclick="hapusBarisJurnalFin(${v.id_jurnal})" class="text-red-500">Hapus</button></td>`;
                    tKeluar.appendChild(tr);
                } else if(v.tipe_jurnal === "Uang Masuk") {
                    totalDanaMasukLuar += v.nominal;
                    tr.innerHTML = `<td>${v.tanggal}</td><td class="text-blue-600 font-semibold">${v.klasifikasi_akun}</td><td>${v.keterangan_memo}</td><td class="text-right font-mono">Rp ${v.nominal.toLocaleString()}</td><td class="text-right"><button onclick="hapusBarisJurnalFin(${v.id_jurnal})" class="text-red-500">Hapus</button></td>`;
                    tMasuk.appendChild(tr);
                }
            }
            cursor.continue();
        } else {
            let labaBersihReal = (omsetPOS + totalDanaMasukLuar) - totalBeban;
            document.getElementById("sum-omset").innerText = "Rp " + omsetPOS.toLocaleString();
            document.getElementById("sum-pengeluaran").innerText = "Rp " + totalBeban.toLocaleString();
            document.getElementById("sum-laba").innerText = "Rp " + labaBersihReal.toLocaleString();
            if(labaBersihReal < 0) {
                document.getElementById("sum-laba").className = "text-2xl font-bold text-red-600 mt-1";
            } else {
                document.getElementById("sum-laba").className = "text-2xl font-bold text-green-700 mt-1";
            }
        }
    };
}

function hapusBarisJurnalFin(id) {
    if(confirm("Hapus baris transaksi jurnal akuntansi ini?")) {
        db.transaction(["store_jurnal_akuntansi"], "readwrite").objectStore("store_jurnal_akuntansi").delete(id).onsuccess = () => refreshAllDashboardsData();
    }
}

// --- INTER-DEVICE DATA SYNC BRIDGE ---
function exportFullSystemBackup() {
    const backup = {};
    const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject"];
    let processed = 0;

    stores.forEach(name => {
        backup[name] = [];
        db.transaction([name], "readonly").objectStore(name).openCursor().onsuccess = function(e) {
            const cursor = e.target.result;
            if(cursor) { backup[name].push(cursor.value); cursor.continue(); }
        };
        db.transaction([name], "readonly").oncomplete = function() {
            processed++;
            if(processed === stores.length) {
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `CLOTHVERSH_LIGHT_BACKUP_${Date.now()}.json`;
                a.click();
            }
        };
    });
}

function importFullSystemBackup(input) {
    const file = input.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject"];
            const tx = db.transaction(stores, "readwrite");
            
            stores.forEach(name => {
                if(data[name] && Array.isArray(data[name])) {
                    const store = tx.objectStore(name);
                    store.clear();
                    data[name].forEach(record => store.put(record));
                }
            });
            tx.oncomplete = () => { alert("Sinkronisasi Ekosistem Berhasil Terpasang!"); refreshAllDashboardsData(); };
        } catch(err) { alert("File JSON tidak valid atau rusak."); }
    };
    reader.readAsText(file);
}

// --- PDF & EXCEL REVENUE EXKURSION SYSTEMS ---
function downloadStokMasterPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("CLOTHVERSH SYSTEM - MASTER INVENTORY REPORT", 14, 15);
    
    let rows = [];
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            v.matriks_varian.forEach(mv => {
                rows.push([v.nama_model, v.jenis_kain, mv.warna, mv.size, mv.stok, `Rp ${mv.hpp_varian}`, `Rp ${mv.jual_varian}`]);
            });
            cursor.continue();
        } else {
            doc.autoTable({ head: [['Model', 'Bahan', 'Warna', 'Size', 'Stok', 'HPP', 'Jual']], body: rows, startY: 22 });
            doc.save("Master_Inventory.pdf");
        }
    };
}

function downloadAccountingReportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pTime = getPeriodeFilterGlobal();
    doc.text(`CLOTHVERSH JURNAL FINANCIAL REPORT (${pTime.bulan}/${pTime.tahun})`, 14, 15);

    let rows = [];
    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                rows.push([v.tanggal, v.tipe_jurnal, v.klasifikasi_akun, v.keterangan_memo, `Rp ${v.nominal.toLocaleString()}`]);
            }
            cursor.continue();
        } else {
            doc.autoTable({ head: [['Tanggal', 'Tipe', 'Klasifikasi', 'Memo', 'Nominal']], body: rows, startY: 22 });
            doc.save(`Laporan_Keuangan_${pTime.bulan}_${pTime.tahun}.pdf`);
        }
    };
}

function downloadPOSLogPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("CLOTHVERSH SYSTEM - DAILY POS TRANS LOGS", 14, 15);
    let rows = [];
    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            rows.push([v.tanggal_order, `#CVS-${v.id_transaksi}`, v.nama_produk, `${v.varian_warna}/${v.varian_size}`, v.qty, `Rp ${v.grand_total.toLocaleString()}`]);
            cursor.continue();
        } else {
            doc.autoTable({ head: [['Tanggal', 'ID Transaksi', 'Model', 'Varian', 'Qty', 'Total']], body: rows, startY: 22 });
            doc.save("POS_Harian_Log.pdf");
        }
    };
}

function exportAnalyticsCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Model,Warna,Size,Qty,Platform,Total Omset\n";
    const pTime = getPeriodeFilterGlobal();

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                csvContent += `${v.tanggal_order},${v.nama_produk},${v.varian_warna},${v.varian_size},${v.qty},${v.platform_order},${v.grand_total}\n`;
            }
            cursor.continue();
        } else {
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Analisis_Produk_${pTime.bulan}_${pTime.tahun}.csv`);
            link.click();
        }
    };
}
