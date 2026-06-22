/**
 * CLOTHVERSH SYSTEM ENGINE CORE - LOGIC ARCHITECTURE
 */

let db;
const dbName = "ClothvershDB";

// Initialize Data Base Connection
const dbRequest = indexedDB.open(dbName, 2);

dbRequest.onupgradeneeded = function(e) {
    db = e.target.result;
    const storeNames = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi"];
    storeNames.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
            let key = (name === "store_produk") ? "id" : 
                      (name === "store_hpp") ? "id_hpp" : 
                      (name === "store_transaksi") ? "id_transaksi" : "id_jurnal";
            db.createObjectStore(name, { keyPath: key, autoIncrement: true });
        }
    });
};

dbRequest.onsuccess = function(e) {
    db = e.target.result;
    initSystemHooks();
};

function getPeriodeFilter() {
    return {
        bulan: document.getElementById("filter-bulan").value,
        tahun: document.getElementById("filter-tahun").value
    };
}

function initSystemHooks() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("pos-tgl-order").value = today;
    document.getElementById("pos-tgl-po").value = today;

    // Attach System Listener Filter Global
    document.getElementById("filter-bulan").addEventListener("change", refreshAllDashboards);
    document.getElementById("filter-tahun").addEventListener("change", refreshAllDashboards);
    
    // Attach Dynamic Calculator Hooks HPP
    document.querySelectorAll(".input-calc-hpp").forEach(input => {
        input.addEventListener("input", calculateLiveHPPForm);
    });

    // Attach POS Cash Calculator Hooks
    document.getElementById("pos-qty").addEventListener("input", calculateLivePOSPrice);
    document.getElementById("pos-diskon").addEventListener("input", calculateLivePOSPrice);
    document.getElementById("pos-ongkir").addEventListener("input", calculateLivePOSPrice);
    document.getElementById("pos-dp").addEventListener("input", calculateLivePOSPrice);
    document.getElementById("pos-status-bayar").addEventListener("change", calculateLivePOSPrice);
    document.getElementById("pos-platform").addEventListener("change", calculateLivePOSPrice);
    document.getElementById("pos-produk-varian").addEventListener("change", calculateLivePOSPrice);

    refreshAllDashboards();
}

function refreshAllDashboards() {
    renderStokDashboard();
    renderHPPDashboard();
    renderPOSDashboard();
    renderFinanceDashboard();
}

// --- TAB ROUTING SYSTEM ---
function switchTab(target) {
    ['stok', 'hpp', 'pos', 'finance'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.add('hidden');
        if(document.getElementById(`btn-nav-${t}`)) document.getElementById(`btn-nav-${t}`).classList.remove('active-nav');
        if(document.getElementById(`btn-m-nav-${t}`)) {
            document.getElementById(`btn-m-nav-${t}`).classList.remove('text-[#396399]');
            document.getElementById(`btn-m-nav-${t}`).classList.add('text-gray-500');
        }
    });
    document.getElementById(`panel-${target}`).classList.remove('hidden');
    if(document.getElementById(`btn-nav-${target}`)) document.getElementById(`btn-nav-${target}`).classList.add('active-nav');
    if(document.getElementById(`btn-m-nav-${target}`)) {
        document.getElementById(`btn-m-nav-${target}`).classList.add('text-[#396399]');
        document.getElementById(`btn-m-nav-${target}`).classList.remove('text-gray-500');
    }
    const titles = { stok: 'Input Stok Pakaian', hpp: 'Manajemen HPP & Harga Jual', pos: 'Terminal POS Kasir', finance: 'Akuntansi & Keuangan' };
    document.getElementById("current-tab-title").innerText = titles[target];
}

// --- DASHBOARD STOK SYSTEM ---
function tambahBarisWarna() {
    const container = document.getElementById("matrix-warna-container");
    const div = document.createElement("div");
    div.className = "grid grid-cols-6 gap-1 warna-row mt-1";
    div.innerHTML = `
        <input type="text" placeholder="Warna" class="col-span-2 bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-xs input-warna-nama" required>
        <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-s" value="0">
        <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-m" value="0">
        <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-l" value="0">
        <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-xl" value="0">
    `;
    container.appendChild(div);
}

document.getElementById("form-stok").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("stok-id").value;
    const matrix_varian = [];

    document.querySelectorAll(".warna-row").forEach(row => {
        const warna = row.querySelector(".input-warna-nama").value.trim();
        if(warna) {
            ['S', 'M', 'L', 'XL'].forEach(size => {
                let qtyClass = `.input-${size.toLowerCase()}`;
                let qty = parseInt(row.querySelector(qtyClass).value) || 0;
                matrix_varian.push({ warna, size, stok: qty });
            });
        }
    });

    const payload = {
        nama_model: document.getElementById("stok-nama").value,
        jenis_kain: document.getElementById("stok-kain").value,
        tipe_kain_gsm: document.getElementById("stok-gsm").value,
        detail_production: document.getElementById("stok-detail").value,
        wh: parseInt(document.getElementById("stok-wh").value) || 0,
        ht: parseInt(document.getElementById("stok-ht").value) || 0,
        tb: parseInt(document.getElementById("stok-tb").value) || 0,
        bb: parseInt(document.getElementById("stok-bb").value) || 0,
        matrix_varian
    };

    const tx = db.transaction(["store_produk"], "readwrite");
    if(id) { payload.id = parseInt(id); tx.objectStore("store_produk").put(payload); }
    else { tx.objectStore("store_produk").add(payload); }

    tx.oncomplete = function() {
        document.getElementById("form-stok").reset();
        document.getElementById("stok-id").value = "";
        document.getElementById("matrix-warna-container").innerHTML = `
            <div class="grid grid-cols-6 gap-1 warna-row">
                <input type="text" placeholder="Warna" class="col-span-2 bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-xs input-warna-nama" required>
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-s" value="0">
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-m" value="0">
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-l" value="0">
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-xl" value="0">
            </div>`;
        refreshAllDashboards();
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
            tr.className = "border-b border-white/5 text-xs hover:bg-white/[0.01]";
            
            let variantHTML = "";
            v.matrix_varian.forEach((mv, index) => {
                variantHTML += `
                    <div class="flex items-center gap-1 bg-[#2c2c2e] px-2 py-1 rounded-lg text-[10px]">
                        <span>${mv.warna} [${mv.size}]:</span>
                        <input type="number" value="${mv.stok}" onchange="updateLiveStockOpname(${v.id}, ${index}, this.value)" class="w-10 bg-black text-center border border-white/10 text-amber-400 font-mono rounded">
                    </div>`;
            });

            tr.innerHTML = `
                <td class="py-3 font-semibold text-white">
                    ${v.nama_model}<br>
                    <span class="text-[10px] text-gray-500 font-mono">${v.jenis_kain} - ${v.tipe_kain_gsm} (WH:${v.wh} HT:${v.ht})</span>
                </td>
                <td class="py-3"><div class="flex flex-wrap gap-1 max-w-md">${variantHTML}</div></td>
                <td class="py-3 text-right space-x-1 whitespace-nowrap">
                    <button onclick="editStokMaster(${v.id})" class="px-2 py-1 bg-white/10 rounded-md">Edit</button>
                    <button onclick="deleteStokMaster(${v.id})" class="px-2 py-1 bg-red-900/30 text-red-400 rounded-md">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function updateLiveStockOpname(id, index, newVal) {
    const tx = db.transaction(["store_produk"], "readwrite");
    const store = tx.objectStore("store_produk");
    store.get(id).onsuccess = function(e) {
        const item = e.target.result;
        if(item) {
            item.matrix_varian[index].stok = parseInt(newVal) || 0;
            store.put(item);
        }
    };
}

function deleteStokMaster(id) {
    if(confirm("Hapus master inventori model pakaian ini?")) {
        const tx = db.transaction(["store_produk"], "readwrite");
        tx.objectStore("store_produk").delete(id);
        tx.oncomplete = () => refreshAllDashboards();
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
        document.getElementById("stok-detail").value = v.detail_production || "";
        document.getElementById("stok-wh").value = v.wh;
        document.getElementById("stok-ht").value = v.ht;
        document.getElementById("stok-tb").value = v.tb;
        document.getElementById("stok-bb").value = v.bb;

        const container = document.getElementById("matrix-warna-container");
        container.innerHTML = "";
        
        // Group matrix by color for visualization row structure
        let colorsMap = {};
        v.matrix_varian.forEach(mv => {
            if(!colorsMap[mv.warna]) colorsMap[mv.warna] = { S:0, M:0, L:0, XL:0 };
            colorsMap[mv.warna][mv.size] = mv.stok;
        });

        for (const [warna, sizes] of Object.entries(colorsMap)) {
            const div = document.createElement("div");
            div.className = "grid grid-cols-6 gap-1 warna-row";
            div.innerHTML = `
                <input type="text" value="${warna}" class="col-span-2 bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-xs input-warna-nama" required>
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-s" value="${sizes.S}">
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-m" value="${sizes.M}">
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-l" value="${sizes.L}">
                <input type="number" class="bg-[#1c1c1e] border border-white/5 rounded-lg p-1 text-center text-xs input-xl" value="${sizes.XL}">
            `;
            container.appendChild(div);
        }
    };
}

// --- DASHBOARD HPP MANAGEMENT SYSTEM ---
function calculateLiveHPPForm() {
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
    const prices = {};
    channels.forEach(ch => {
        let pct = parseFloat(document.getElementById(`adm-${ch}`).value) || 0;
        if(ch === 'reseller') { prices[ch] = Math.round(hargaDasar * (1 - (pct / 100))); }
        else { prices[ch] = Math.round(hargaDasar / (1 - (pct / 100))); }
    });

    const payload = {
        nama_model: document.getElementById("hpp-nama").value, biaya_kain: kain, ongkos_jahit: jahit,
        aplikasi_sablon: sablon, packaging: pack, margin_persen: margin, hpp_total, harga_jual_channels: prices
    };

    const tx = db.transaction(["store_hpp"], "readwrite");
    if(id) { payload.id_hpp = parseInt(id); tx.objectStore("store_hpp").put(payload); }
    else { tx.objectStore("store_hpp").add(payload); }

    tx.oncomplete = () => { document.getElementById("form-hpp").reset(); document.getElementById("hpp-id").value=""; refreshAllDashboards(); };
});

function renderHPPDashboard() {
    const tbody = document.getElementById("table-hpp");
    tbody.innerHTML = "";
    db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const tr = document.createElement("tr");
            tr.className = "border-b border-white/5 text-xs";
            tr.innerHTML = `
                <td class="py-3 font-semibold text-white">${v.nama_model}</td>
                <td class="py-3 font-mono text-gray-400">Rp ${v.hpp_total.toLocaleString()}</td>
                <td class="py-3 font-mono space-y-0.5 text-[11px]">
                    <span class="block text-green-400">WA: Rp ${v.harga_jual_channels.wa.toLocaleString()}</span>
                    <span class="block text-orange-400">Shopee: Rp ${v.harga_jual_channels.shopee.toLocaleString()}</span>
                    <span class="block text-pink-400">TikTok: Rp ${v.harga_jual_channels.tiktok.toLocaleString()}</span>
                    <span class="block text-blue-400">Reseller: Rp ${v.harga_jual_channels.reseller.toLocaleString()}</span>
                </td>
                <td class="py-3 text-right space-x-1 whitespace-nowrap">
                    <button onclick="editHPPEngine(${v.id_hpp})" class="px-2 py-1 bg-white/10 rounded-md">Edit</button>
                    <button onclick="deleteHPPEngine(${v.id_hpp})" class="px-2 py-1 bg-red-900/30 text-red-400 rounded-md">Hapus</button>
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
        document.getElementById("hpp-margin").value = v.margin_persen;
        calculateLiveHPPForm();
    };
}

function deleteHPPEngine(id) {
    if(confirm("Hapus rekam skema HPP model ini?")) {
        const tx = db.transaction(["store_hpp"], "readwrite");
        tx.objectStore("store_hpp").delete(id);
        tx.oncomplete = () => refreshAllDashboards();
    }
}

// --- TERMINAL POS KASIR SYSTEM ---
function renderPOSDashboard() {
    const select = document.getElementById("pos-produk-varian");
    select.innerHTML = '<option value="">-- Pilih Item Varian --</option>';
    
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const p = cursor.value;
            p.matrix_varian.forEach((mv, idx) => {
                if(mv.stok > 0) {
                    let opt = document.createElement("option");
                    opt.value = `${p.id}|${mv.warna}|${mv.size}|${idx}`;
                    opt.innerText = `${p.nama_model} - ${mv.warna} [${mv.size}] (Stok: ${mv.stok})`;
                    select.appendChild(opt);
                }
            });
            cursor.continue();
        }
    };
    renderPOSLogTable();
}

function calculateLivePOSPrice() {
    const val = document.getElementById("pos-produk-varian").value;
    if(!val) return;
    const [pId] = val.split("|");
    const platform = document.getElementById("pos-platform").value;
    const qty = parseInt(document.getElementById("pos-qty").value) || 1;
    const diskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
    const ongkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
    const dp = parseFloat(document.getElementById("pos-dp").value) || 0;
    const status = document.getElementById("pos-status-bayar").value;

    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(parseInt(pId)).onsuccess = function(e) {
        const prod = e.target.result;
        db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").openCursor().onsuccess = function(ev) {
            const cur = ev.target.result;
            let unitPrice = 150000; // Fallback default price channel
            if(cur) {
                if(cur.value.nama_model === prod.nama_model) {
                    let keyChannel = platform === 'WhatsApp' ? 'wa' : platform.toLowerCase().replace(' shop', '').replace(' marketplace', '');
                    unitPrice = cur.value.harga_jual_channels[keyChannel] || unitPrice;
                }
                cur.continue();
            } else {
                let grandTotal = (unitPrice * qty) - diskon + ongkir;
                if(grandTotal < 0) grandTotal = 0;
                
                let sisa = 0;
                if(status === 'Lunas') { document.getElementById("pos-dp").value = 0; sisa = 0; }
                else { sisa = grandTotal - dp; }
                
                document.getElementById("pos-sisa").value = sisa < 0 ? 0 : sisa;
            }
        };
    };
}

document.getElementById("form-pos").addEventListener("submit", function(e) {
    e.preventDefault();
    const val = document.getElementById("pos-produk-varian").value;
    if(!val) return alert("Pilih varian item terlebih dahulu!");

    const [pId, warna, size, matrixIdx] = val.split("|");
    const qty = parseInt(document.getElementById("pos-qty").value);
    const platform = document.getElementById("pos-platform").value;
    const status_bayar = document.getElementById("pos-status-bayar").value;
    const dp = parseFloat(document.getElementById("pos-dp").value) || 0;
    const sisa = parseFloat(document.getElementById("pos-sisa").value) || 0;
    const tglOrder = document.getElementById("pos-tgl-order").value;
    const pTime = getPeriodeFilter();

    const tx = db.transaction(["store_produk", "store_transaksi", "store_jurnal_akuntansi"], "readwrite");
    
    tx.objectStore("store_produk").get(parseInt(pId)).onsuccess = function(ev) {
        const prod = ev.target.result;
        if(prod.matrix_varian[matrixIdx].stok < qty) {
            alert("Eksekusi batal, stok di lemari tidak mencukupi!");
            return;
        }
        
        prod.matrix_varian[matrixIdx].stok -= qty;
        tx.objectStore("store_produk").put(prod);

        db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").openCursor().onsuccess = function(hppEv) {
            const hCur = hppEv.target.result;
            let price = 150000;
            if(hCur) {
                if(hCur.value.nama_model === prod.nama_model) {
                    let key = platform === 'WhatsApp' ? 'wa' : platform.toLowerCase().replace(' shop', '').replace(' marketplace', '');
                    price = hCur.value.harga_jual_channels[key] || price;
                }
                hCur.continue();
            } else {
                let diskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
                let ongkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
                let grand = (price * qty) - diskon + ongkir;

                const trx = {
                    tanggal_order: tglOrder, tanggal_selesai_po: document.getElementById("pos-tgl-po").value,
                    produk_id: parseInt(pId), varian_warna: warna, varian_size: size, qty, grand_total: grand,
                    diskon, ongkir, ekspedisi: document.getElementById("pos-kurir-resi").value,
                    metode_bayar: document.getElementById("pos-metode").value, status_bayar, jumlah_dp: dp, sisa_tagihan: sisa,
                    timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun, nama_produk: prod.nama_model, platform
                };
                tx.objectStore("store_transaksi").add(trx);

                // Entry Jurnal Arus Kas Masuk POS
                let cashReceived = status_bayar === 'Lunas' ? grand : dp;
                if(cashReceived > 0) {
                    tx.objectStore("store_jurnal_akuntansi").add({
                        tanggal: tglOrder, tipe_jurnal: "Uang Masuk", klasifikasi_akun: "POS Penjualan",
                        nominal: cashReceived, keterangan_memo: `[POS] ${platform} - ${prod.nama_model} (${qty} Pcs)`,
                        timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun
                    });
                }
            }
        };
    };

    tx.oncomplete = () => { document.getElementById("form-pos").reset(); initSystemHooks(); };
});

function renderPOSLogTable() {
    const tbody = document.getElementById("table-pos-log");
    tbody.innerHTML = "";
    const pTime = getPeriodeFilter();

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-white/5 text-xs";
                tr.innerHTML = `
                    <td class="py-2 font-mono">#TRX-${v.id_transaksi}</td>
                    <td><b>${v.nama_produk}</b><br><span class="text-[10px] text-gray-500">${v.varian_warna} / ${v.varian_size} (${v.platform})</span></td>
                    <td class="font-mono text-green-400">Rp ${v.grand_total.toLocaleString()}</td>
                    <td><span class="px-1.5 py-0.5 rounded text-[10px] ${v.status_bayar==='Lunas'?'bg-green-900/40 text-green-300':'bg-amber-900/40 text-amber-300'}">${v.status_bayar}</span></td>
                    <td class="text-right whitespace-nowrap">
                        <button onclick="bukaPopUpStrukThermal(${v.id_transaksi})" class="px-2 py-0.5 bg-white/10 rounded">Struk</button>
                        <button onclick="hapusPOSLog(${v.id_transaksi})" class="text-red-400 ml-1 hover:underline">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

function hapusPOSLog(id) {
    if(confirm("Hapus log penjualan ini? (Peringatan: Stok tidak otomatis kembali)")) {
        const tx = db.transaction(["store_transaksi"], "readwrite");
        tx.objectStore("store_transaksi").delete(id);
        tx.oncomplete = () => refreshAllDashboards();
    }
}

function bukaPopUpStrukThermal(id) {
    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").get(id).onsuccess = function(e) {
        const v = e.target.result;
        if(!v) return;
        const printArea = document.getElementById("thermal-print-area");
        printArea.innerHTML = `
            <div style="text-align:center; font-weight:bold; font-size:13px;">CLOTHVERSH SYSTEM</div>
            <div style="text-align:center; font-size:9px;">Premium Apparel Industry</div>
            <div style="border-top:1px dashed #000; margin:5px 0;"></div>
            <div>NOTA: #TRX-${v.id_transaksi}</div>
            <div>Order: ${v.tanggal_order}</div>
            <div>PO Ready: ${v.tanggal_selesai_po}</div>
            <div>Platform: ${v.platform}</div>
            <div style="border-top:1px dashed #000; margin:5px 0;"></div>
            <div style="font-weight:bold;">${v.nama_produk}</div>
            <div>Varian: ${v.varian_warna} [${v.varian_size}] x ${v.qty}</div>
            <div style="border-top:1px dashed #000; margin:5px 0;"></div>
            <div style="display:flex; justify-content:space-between;"><span>Diskon:</span><span>Rp ${v.diskon.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Ongkir:</span><span>Rp ${v.ongkir.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>Grand Total:</span><span>Rp ${v.grand_total.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>DP Masuk:</span><span>Rp ${v.jumlah_dp.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:red;"><span>Sisa Tagihan:</span><span>Rp ${v.sisa_tagihan.toLocaleString()}</span></div>
            <div style="border-top:1px dashed #000; margin:5px 0;"></div>
            <div style="text-align:center; font-size:9px; margin-top:5px;">Terima Kasih Atas Kepercayaan Anda</div>
        `;
        document.getElementById("modal-receipt-view").classList.remove("hidden");
    };
}

// --- AKUNTANSI & BUKU BESAR SUB-DASHBOARD ---
function switchFinanceSubTab(target) {
    ['sub-penjualan', 'sub-pengeluaran', 'sub-masuk'].forEach(sub => {
        document.getElementById(`panel-${sub}`).classList.add('hidden');
        document.getElementById(`btn-${sub}`).className = "px-4 py-2 text-xs font-bold text-gray-500 hover:text-white";
    });
    document.getElementById(`panel-${target}`).classList.remove('hidden');
    document.getElementById(`btn-${target}`).className = "px-4 py-2 text-xs font-bold border-b-2 border-[#396399] text-white";
}

document.getElementById("form-jurnal-keluar").addEventListener("submit", function(e) {
    e.preventDefault();
    postManualAccountingJournal("Pengeluaran", "jurnal-keluar-akun", "jurnal-keluar-nominal", "jurnal-keluar-memo");
});

document.getElementById("form-jurnal-masuk").addEventListener("submit", function(e) {
    e.preventDefault();
    postManualAccountingJournal("Uang Masuk", "jurnal-masuk-akun", "jurnal-masuk-nominal", "jurnal-masuk-memo");
});

function postManualAccountingJournal(type, elemAkun, elemNominal, elemMemo) {
    const pTime = getPeriodeFilter();
    const payload = {
        tanggal: new Date().toISOString().split('T')[0],
        tipe_jurnal: type,
        klasifikasi_akun: document.getElementById(elemAkun).value,
        nominal: parseFloat(document.getElementById(elemNominal).value) || 0,
        keterangan_memo: document.getElementById(elemMemo).value,
        timestamp: Date.now(), bulan: pTime.bulan, tahun: pTime.tahun
    };
    const tx = db.transaction(["store_jurnal_akuntansi"], "readwrite");
    tx.objectStore("store_jurnal_akuntansi").add(payload);
    tx.oncomplete = () => {
        document.getElementById(elemNominal).value = "";
        document.getElementById(elemMemo).value = "";
        refreshAllDashboards();
    };
}

function renderFinanceDashboard() {
    const pTime = getPeriodeFilter();
    let omsetKotor = 0, totalBeban = 0, totalSuntikanMasuk = 0;

    const tKeluar = document.getElementById("table-jurnal-keluar");
    const tMasuk = document.getElementById("table-jurnal-masuk");
    tKeluar.innerHTML = ""; tMasuk.innerHTML = "";

    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-white/5 text-xs";
                
                if(v.tipe_jurnal === "Pengeluaran") {
                    totalBeban += v.nominal;
                    tr.innerHTML = `
                        <td class="py-2">${v.tanggal}</td>
                        <td class="text-red-400 font-medium">${v.klasifikasi_akun}</td>
                        <td class="text-gray-400">${v.keterangan_memo}</td>
                        <td class="text-right font-mono">Rp ${v.nominal.toLocaleString()}</td>
                        <td class="text-right"><button onclick="hapusJurnalBaris(${v.id_jurnal})" class="text-red-500">Hapus</button></td>
                    `;
                    tKeluar.appendChild(tr);
                } else if(v.tipe_jurnal === "Uang Masuk") {
                    if(v.klasifikasi_akun === "POS Penjualan") { omsetKotor += v.nominal; } 
                    else {
                        totalSuntikanMasuk += v.nominal;
                        tr.innerHTML = `
                            <td class="py-2">${v.tanggal}</td>
                            <td class="text-green-400 font-medium">${v.klasifikasi_akun}</td>
                            <td class="text-gray-400">${v.keterangan_memo}</td>
                            <td class="text-right font-mono">Rp ${v.nominal.toLocaleString()}</td>
                            <td class="text-right"><button onclick="hapusJurnalBaris(${v.id_jurnal})" class="text-red-500">Hapus</button></td>
                        `;
                        tMasuk.appendChild(tr);
                    }
                }
            }
            cursor.continue();
        } else {
            // Formula Akuntansi Laba Bersih Riil Cashflow
            let labaBersihReal = (omsetKotor + totalSuntikanMasuk) - totalBeban;
            
            document.getElementById("sum-omset").innerText = "Rp " + omsetKotor.toLocaleString();
            document.getElementById("sum-pengeluaran").innerText = "Rp " + totalBeban.toLocaleString();
            document.getElementById("sum-laba").innerText = "Rp " + labaBersihReal.toLocaleString();
        }
    };
}

function hapusJurnalBaris(id) {
    if(confirm("Hapus baris pencatatan kas akuntansi ini?")) {
        const tx = db.transaction(["store_jurnal_akuntansi"], "readwrite");
        tx.objectStore("store_jurnal_akuntansi").delete(id);
        tx.oncomplete = () => refreshAllDashboards();
    }
}

// --- INTER-DEVICE DATA SYNC BRIDGE (JSON INTERFACES) ---
function exportFullSystemBackup() {
    const backupData = {};
    const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi"];
    let counter = 0;

    stores.forEach(storeName => {
        backupData[storeName] = [];
        const tx = db.transaction([storeName], "readonly");
        tx.objectStore(storeName).openCursor().onsuccess = function(e) {
            const cursor = e.target.result;
            if(cursor) {
                backupData[storeName].push(cursor.value);
                cursor.continue();
            }
        };
        tx.oncomplete = function() {
            counter++;
            if(counter === stores.length) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `CLOTHVERSH_BACKUP_${Date.now()}.json`);
                downloadAnchor.click();
            }
        };
    });
}

function importFullSystemBackup(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi"];
            
            const tx = db.transaction(stores, "readwrite");
            stores.forEach(storeName => {
                if(parsedData[storeName] && Array.isArray(parsedData[storeName])) {
                    const store = tx.objectStore(storeName);
                    store.clear(); // Bersihkan database lokal sebelum menimpa data baru
                    parsedData[storeName].forEach(record => {
                        store.put(record);
                    });
                }
            });

            tx.oncomplete = function() {
                alert("Sinkronisasi Basis Data Sukses Terpasang!");
                refreshAllDashboards();
            };
        } catch (err) {
            alert("Gagal membaca file backup, pastikan format dokumen .json valid.");
        }
    };
    reader.readAsText(file);
}

// --- DATA EXPORT REPORTING TOOLS (PDF ENGINE) ---
function downloadFinancePDF(type) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pTime = getPeriodeFilter();

    doc.setFont("Helvetica", "bold");
    doc.text(`LAPORAN AKUNTANSI RESMI JURNAL ${type.toUpperCase()}`, 14, 15);
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`Periode Cetak: ${pTime.bulan} / ${pTime.tahun} | Clothversh System Cloud Sync`, 14, 21);

    let rows = [];
    let headers = [['Tanggal', 'Klasifikasi Akun', 'Keterangan Memo', 'Nominal']];

    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === pTime.bulan && v.tahun === pTime.tahun) {
                if(type === 'Penjualan' && v.klasifikasi_akun === 'POS Penjualan') {
                    rows.push([v.tanggal, v.klasifikasi_akun, v.keterangan_memo, `Rp ${v.nominal.toLocaleString()}`]);
                }
            }
            cursor.continue();
        } else {
            doc.autoTable({ head: headers, body: rows, startY: 26, styles: { fontSize: 9 } });
            doc.save(`Laporan_${type}_${pTime.bulan}_${pTime.tahun}.pdf`);
        }
    };
}
