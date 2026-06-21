// --- CENTRAL DB SYSTEM ARCHITECTURE ---
let db;
const dbName = "ClothversDB";

const request = indexedDB.open(dbName, 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("store_produk")) {
        db.createObjectStore("store_produk", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("store_transaksi")) {
        db.createObjectStore("store_transaksi", { keyPath: "id_transaksi", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("store_cashflow")) {
        db.createObjectStore("store_cashflow", { keyPath: "id_flow", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("store_retur_po")) {
        db.createObjectStore("store_retur_po", { keyPath: "id_retur", autoIncrement: true });
    }
};

request.onsuccess = function(e) {
    db = e.target.result;
    initApp();
};

function getActivePeriode() {
    return {
        bulan: document.getElementById("filter-bulan").value,
        tahun: document.getElementById("filter-tahun").value
    };
}

function initApp() {
    // Set default timeline kasir hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("pos-tgl-pesan").value = today;
    document.getElementById("pos-tgl-estimasi").value = today;

    renderStokTable();
    syncDropdownProdukPOS();
    renderPOSTable();
    renderReturTable();
    renderFinanceDashboard();
    initChartCore();

    document.getElementById("filter-bulan").addEventListener("change", reloadedFilterContext);
    document.getElementById("filter-tahun").addEventListener("change", reloadedFilterContext);
}

function reloadedFilterContext() {
    renderPOSTable();
    renderFinanceDashboard();
    renderReturTable();
    updateChartDataVisual();
}

// --- GLOBAL SIDEBAR SWITCHER ---
function switchTab(target) {
    const listTabs = ['stok', 'hpp', 'pos', 'retur', 'finance', 'analytics'];
    listTabs.forEach(t => {
        document.getElementById(`panel-${t}`).classList.add('hidden');
        const dNav = document.getElementById(`btn-nav-${t}`);
        const mNav = document.getElementById(`btn-m-nav-${t}`);
        if(dNav) dNav.classList.remove('active-nav');
        if(mNav) { mNav.classList.remove('text-[#396399]'); mNav.classList.add('text-gray-500'); }
    });

    document.getElementById(`panel-${target}`).classList.remove('hidden');
    const actDNav = document.getElementById(`btn-nav-${target}`);
    const actMNav = document.getElementById(`btn-m-nav-${target}`);
    if(actDNav) actDNav.classList.add('active-nav');
    if(actMNav) { actMNav.classList.add('text-[#396399]'); actMNav.classList.remove('text-gray-500'); }

    const mapTitles = { stok: 'Input Stok Pakaian', hpp: 'Kalkulasi HPP & Rekomendasi Harga', pos: 'Mesin Kasir / POS', retur: 'Modul Retur & Barang Cacat', finance: 'Laporan Keuangan Cashflow', analytics: 'Analisis Grafik' };
    document.getElementById("current-tab-title").innerText = mapTitles[target];
}

// --- MODULE A: REVISI INPUT STOK MULTI-WARNA & FIX EDIT ---
document.getElementById("form-stok").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("stok-id").value;
    const rawWarna = document.getElementById("stok-warna").value;
    
    // Pecah input warna terpisah koma menjadi array bersih
    const warnaArray = rawWarna.split(",").map(w => w.trim()).filter(w => w !== "");

    const baseItem = {
        nama: document.getElementById("stok-nama").value,
        kain: document.getElementById("stok-kain").value,
        size: document.getElementById("stok-size").value,
        detail_prod: document.getElementById("stok-detail-prod").value,
        qty: parseInt(document.getElementById("stok-qty").value),
        ld: parseInt(document.getElementById("stok-ld").value) || 0,
        pb: parseInt(document.getElementById("stok-pb").value) || 0,
        pl: parseInt(document.getElementById("stok-pl").value) || 0,
        lk: parseInt(document.getElementById("stok-lk").value) || 0,
        hpp: parseFloat(document.getElementById("stok-hpp").value),
        jual: parseFloat(document.getElementById("stok-jual").value)
    };

    const transaction = db.transaction(["store_produk"], "readwrite");
    const store = transaction.objectStore("store_produk");

    if (id) {
        // Mode Edit Update Tunggal (Gunakan warna pertama saja atau warna asal)
        baseItem.id = parseInt(id);
        baseItem.warna = warnaArray[0] || "Default";
        store.put(baseItem);
    } else {
        // Mode Tambah: Generate baris data per masing-masing warna otomatis
        warnaArray.forEach(warna => {
            const newItem = { ...baseItem, warna: warna };
            store.add(newItem);
        });
    }

    transaction.oncomplete = function() {
        document.getElementById("form-stok").reset();
        document.getElementById("stok-id").value = "";
        renderStokTable();
        syncDropdownProdukPOS();
    };
});

function renderStokTable() {
    const tbody = document.getElementById("table-stok-body");
    tbody.innerHTML = "";
    const store = db.transaction(["store_produk"], "readonly").objectStore("store_produk");
    store.openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const tr = document.createElement("tr");
            tr.className = "border-b border-white/5 text-[11px] hover:bg-white/[0.02]";
            tr.innerHTML = `
                <td class="py-2.5 font-semibold text-white">${v.nama}</td>
                <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-white/5 text-gray-300">${v.warna}</span></td>
                <td class="py-2.5 text-gray-400 font-mono">WH:${v.ld} HT:${v.pb}<br>TB:${v.pl} BB:${v.lk}</td>
                <td class="py-2.5 text-center">
                    <input type="number" value="${v.qty}" onchange="forceStockOpname(${v.id}, this.value)" class="w-14 bg-[#2c2c2e] border border-white/5 text-center rounded font-mono text-amber-400 p-0.5">
                </td>
                <td class="py-2.5 font-mono">
                    <span class="text-gray-400 block">H: ${v.hpp.toLocaleString()}</span>
                    <span class="text-green-400 block">J: ${v.jual.toLocaleString()}</span>
                </td>
                <td class="py-2.5 text-right space-x-1">
                    <button type="button" onclick="loadEditStok(${v.id})" class="px-2 py-0.5 bg-white/10 text-white rounded">Edit</button>
                    <button type="button" onclick="hapusStok(${v.id})" class="px-2 py-0.5 bg-red-900/40 text-red-300 rounded">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function loadEditStok(id) {
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(id).onsuccess = function(e) {
        const v = e.target.result;
        if(!v) return;
        document.getElementById("stok-id").value = v.id;
        document.getElementById("stok-nama").value = v.nama;
        document.getElementById("stok-warna").value = v.warna;
        document.getElementById("stok-kain").value = v.kain;
        document.getElementById("stok-size").value = v.size;
        document.getElementById("stok-detail-prod").value = v.detail_prod || "";
        document.getElementById("stok-qty").value = v.qty;
        document.getElementById("stok-ld").value = v.ld;
        document.getElementById("stok-pb").value = v.pb;
        document.getElementById("stok-pl").value = v.pl;
        document.getElementById("stok-lk").value = v.lk;
        document.getElementById("stok-hpp").value = v.hpp;
        document.getElementById("stok-jual").value = v.jual;
        
        // Geser layar fokus kembali ke form
        document.getElementById("stok-nama").focus();
    };
}

function forceStockOpname(id, val) {
    const tx = db.transaction(["store_produk"], "readwrite");
    const store = tx.objectStore("store_produk");
    store.get(id).onsuccess = function(e) {
        const data = e.target.result;
        if(data) {
            data.qty = parseInt(val) || 0;
            store.put(data);
        }
    };
}

function hapusStok(id) {
    if(confirm("Hapus artikel item data ini?")) {
        const tx = db.transaction(["store_produk"], "readwrite");
        tx.objectStore("store_produk").delete(id);
        tx.oncomplete = function() { renderStokTable(); syncDropdownProdukPOS(); };
    }
}

// --- MODULE B: KALKULASI REKOMENDASI HARGA MANUAL ADMIN ---
function hitungSimulasiHPP() {
    const kain = parseFloat(document.getElementById("calc-kain").value) || 0;
    const jahit = parseFloat(document.getElementById("calc-jahit").value) || 0;
    const sablon = parseFloat(document.getElementById("calc-sablon").value) || 0;
    const pack = parseFloat(document.getElementById("calc-pack").value) || 0;
    const profitPct = parseFloat(document.getElementById("calc-profit").value) || 0;

    const hppTotal = kain + jahit + sablon + pack;
    const hargaBasic = hppTotal + (hppTotal * (profitPct / 100));

    document.getElementById("res-hpp").innerText = "Rp " + hppTotal.toLocaleString();
    document.getElementById("res-basic").innerText = "Rp " + hargaBasic.toLocaleString();

    // Ambil Potongan Fleksibel Manual dari Input Form (%)
    const admWa = parseFloat(document.getElementById("inp-adm-wa").value) || 0;
    const admShopee = parseFloat(document.getElementById("inp-adm-shopee").value) || 0;
    const admTiktok = parseFloat(document.getElementById("inp-adm-tiktok").value) || 0;
    const discReseller = parseFloat(document.getElementById("inp-adm-reseller").value) || 0;
    const discGrosir = parseFloat(document.getElementById("inp-adm-grosir").value) || 0;

    document.getElementById("chan-wa").innerText = "Rp " + Math.round(hargaBasic / (1 - (admWa/100))).toLocaleString();
    document.getElementById("chan-shopee").innerText = "Rp " + Math.round(hargaBasic / (1 - (admShopee/100))).toLocaleString();
    document.getElementById("chan-tiktok").innerText = "Rp " + Math.round(hargaBasic / (1 - (admTiktok/100))).toLocaleString();
    document.getElementById("chan-reseller").innerText = "Rp " + Math.round(hargaBasic * (1 - (discReseller/100))).toLocaleString();
    document.getElementById("chan-grosir").innerText = "Rp " + Math.round(hargaBasic * (1 - (discGrosir/100))).toLocaleString();
}

// --- MODULE C: TERMINAL POS KASIR DENGAN AUTOMATION DP SYSTEM ---
function syncDropdownProdukPOS() {
    const select = document.getElementById("pos-produk");
    const selectRetur = document.getElementById("retur-produk");
    select.innerHTML = ""; selectRetur.innerHTML = "";
    
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const option = `<option value="${v.id}">${v.nama} [${v.warna} - ${v.size}] (Fisik: ${v.qty})</option>`;
            select.innerHTML += option;
            selectRetur.innerHTML += option;
            cursor.continue();
        }
    };
}

// Trigger Live Math DP & Sisa Tagihan
const arrayHooks = ["pos-status-bayar", "pos-dp-bayar", "pos-qty", "pos-diskon", "pos-ongkir", "pos-produk", "pos-komplimen"];
arrayHooks.forEach(hookId => {
    document.getElementById(hookId).addEventListener("input", runLivePOSCalculatorCalculus);
    document.getElementById(hookId).addEventListener("change", runLivePOSCalculatorCalculus);
});

function runLivePOSCalculatorCalculus() {
    const pId = parseInt(document.getElementById("pos-produk").value);
    if(!pId) return;

    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(pId).onsuccess = function(e) {
        const prod = e.target.result;
        if(!prod) return;

        const qty = parseInt(document.getElementById("pos-qty").value) || 1;
        const diskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
        const ongkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
        const isKomplimen = document.getElementById("pos-komplimen").checked;
        const status = document.getElementById("pos-status-bayar").value;
        const dpBayar = parseFloat(document.getElementById("pos-dp-bayar").value) || 0;

        let hargaDasar = isKomplimen ? 0 : prod.jual;
        let grandTotal = (hargaDasar * qty) - diskon + ongkir;
        if(grandTotal < 0) grandTotal = 0;

        let sisa = 0;
        if(status === "Lunas") {
            document.getElementById("pos-dp-bayar").value = 0;
            sisa = 0;
        } else {
            sisa = grandTotal - dpBayar;
        }
        document.getElementById("pos-sisa").value = sisa < 0 ? 0 : sisa;
    };
}

document.getElementById("form-pos").addEventListener("submit", function(e) {
    e.preventDefault();
    const pId = parseInt(document.getElementById("pos-produk").value);
    const pQty = parseInt(document.getElementById("pos-qty").value);
    const pPlatform = document.getElementById("pos-platform").value;
    const isKomplimen = document.getElementById("pos-komplimen").checked;
    const pDiskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
    const pOngkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
    const pStatus = document.getElementById("pos-status-bayar").value;
    const dpBayar = parseFloat(document.getElementById("pos-dp-bayar").value) || 0;
    const pSisa = parseFloat(document.getElementById("pos-sisa").value) || 0;
    const tglPesan = document.getElementById("pos-tgl-pesan").value;
    const tglEstimasi = document.getElementById("pos-tgl-estimasi").value;

    const ctxTime = getActivePeriode();
    const tx = db.transaction(["store_produk", "store_transaksi", "store_cashflow"], "readwrite");
    
    tx.objectStore("store_produk").get(pId).onsuccess = function(evt) {
        const prod = evt.target.result;
        if(prod.qty < pQty) {
            alert("Ambang batas stok tidak mencukupi!");
            return;
        }

        prod.qty -= pQty;
        tx.objectStore("store_produk").put(prod);

        let totalJualItem = isKomplimen ? 0 : (prod.jual * pQty);
        let grandTotal = totalJualItem - pDiskon + pOngkir;
        if(grandTotal < 0) grandTotal = 0;

        const transaksi = {
            bulan: ctxTime.bulan, tahun: ctxTime.tahun,
            tgl_pesan: tglPesan, tgl_estimasi: tglEstimasi,
            produk_id: pId, nama_produk: prod.nama, variant_style: `${prod.warna} [${prod.size}]`,
            qty: pQty, total: grandTotal, diskon: pDiskon, ongkir: pOngkir,
            ekspedisi: document.getElementById("pos-ekspedisi").value,
            resi: document.getElementById("pos-resi").value,
            status_bayar: pStatus, dp_masuk: dpBayar, sisa_tagihan: pSisa,
            platform: pPlatform, hpp_total: (prod.hpp * pQty)
        };
        tx.objectStore("store_transaksi").add(transaksi);

        // Alirkan Arus Kas Riil Masuk (DP atau nilai Lunas)
        let nominalKasMasuk = pStatus === "Lunas" ? grandTotal : dpBayar;
        if(nominalKasMasuk > 0 && !isKomplimen) {
            const flowKas = {
                tanggal: tglPesan, bulan: ctxTime.bulan, tahun: ctxTime.tahun,
                kategori: "Operasional", jenis: "Masuk", nominal: nominalKasMasuk,
                keterangan: `[POS Cashier] ${pPlatform} - ${prod.nama} (${pStatus})`
            };
            tx.objectStore("store_cashflow").add(flowKas);
        }
    };

    tx.oncomplete = function() {
        document.getElementById("form-pos").reset();
        initApp();
    };
});

function renderPOSTable() {
    const tbody = document.getElementById("table-pos-body");
    tbody.innerHTML = "";
    const ctx = getActivePeriode();

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-white/5 text-[11px] hover:bg-white/[0.02]";
                tr.innerHTML = `
                    <td class="py-2.5 font-mono text-gray-400">#TRX-${v.id_transaksi}</td>
                    <td class="py-2.5 text-[10px] text-gray-400">Psn: ${v.tgl_pesan}<br><span class="text-amber-400">Est: ${v.tgl_estimasi}</span></td>
                    <td class="py-2.5"><b class="text-white">${v.nama_produk}</b><br><span class="text-gray-500">${v.variant_style}</span></td>
                    <td class="py-2.5 text-center font-mono">${v.qty}</td>
                    <td class="py-2.5 font-mono">Tot: ${v.total.toLocaleString()}<br><span class="text-red-400">Sisa: ${v.sisa_tagihan.toLocaleString()}</span></td>
                    <td class="py-2.5"><span class="px-1.5 py-0.5 rounded text-[9px] ${v.status_bayar==='Lunas'?'bg-green-900/40 text-green-300':'bg-amber-900/40 text-amber-300'}">${v.status_bayar}</span></td>
                    <td class="py-2.5 text-right space-x-1">
                        <button type="button" onclick="bukaModalPratinjauStruk(${v.id_transaksi})" class="px-2 py-0.5 bg-white/10 rounded">Struk</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

// --- MODULE D: REKONSILIASI KLAIM RETUR ---
document.getElementById("form-retur").addEventListener("submit", function(e) {
    e.preventDefault();
    const pId = parseInt(document.getElementById("retur-produk").value);
    const rJenis = document.getElementById("retur-jenis").value;
    const rQty = parseInt(document.getElementById("retur-qty").value);
    const rRugi = parseFloat(document.getElementById("retur-rugi").value) || 0;
    const ctx = getActivePeriode();

    const tx = db.transaction(["store_produk", "store_retur_po", "store_cashflow"], "readwrite");
    tx.objectStore("store_produk").get(pId).onsuccess = function(evt) {
        const prod = evt.target.result;
        if (rJenis === "Tukar Size") {
            prod.qty += rQty;
        } else if (rJenis === "Cacat") {
            prod.qty -= rQty;
            if(rRugi > 0) {
                tx.objectStore("store_cashflow").add({
                    tanggal: new Date().toISOString().split('T')[0], bulan: ctx.bulan, tahun: ctx.tahun,
                    kategori: "Biaya Penyusutan", jenis: "Keluar", nominal: rRugi,
                    keterangan: `[Defek Reject] Barang Cacat Konveksi: ${prod.nama}`
                });
            }
        }
        tx.objectStore("store_produk").put(prod);
        tx.objectStore("store_retur_po").add({
            tanggal: new Date().toISOString().split('T')[0], bulan: ctx.bulan, tahun: ctx.tahun,
            jenis: rJenis, produk_id: pId, nama_produk: prod.nama, qty: rQty, nominal_rugi: rRugi
        });
    };
    tx.oncomplete = function() {
        document.getElementById("form-retur").reset();
        initApp();
    };
});

function renderReturTable() {
    const tbody = document.getElementById("table-retur-body");
    tbody.innerHTML = "";
    const ctx = getActivePeriode();
    db.transaction(["store_retur_po"], "readonly").objectStore("store_retur_po").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-white/5 text-xs";
                tr.innerHTML = `<td>${v.tanggal}</td><td class="text-amber-400">${v.jenis}</td><td>${v.nama_produk}</td><td class="text-center">${v.qty}</td><td class="text-right font-mono text-red-400">Rp ${v.nominal_rugi.toLocaleString()}</td>`;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

// --- MODULE E: REVISI FINANSIAL UTAL (3 SUB-DASHBOARD TERPISAH) ---
document.getElementById("form-cashflow").addEventListener("submit", function(e) {
    e.preventDefault();
    const ctx = getActivePeriode();
    const flow = {
        tanggal: new Date().toISOString().split('T')[0], bulan: ctx.bulan, tahun: ctx.tahun,
        kategori: document.getElementById("flow-kategori").value,
        jenis: document.getElementById("flow-jenis").value,
        nominal: parseFloat(document.getElementById("flow-nominal").value),
        keterangan: document.getElementById("flow-keterangan").value
    };
    const tx = db.transaction(["store_cashflow"], "readwrite");
    tx.objectStore("store_cashflow").add(flow);
    tx.oncomplete = function() {
        document.getElementById("form-cashflow").reset();
        renderFinanceDashboard();
    };
});

function renderFinanceDashboard() {
    const ctx = getActivePeriode();
    let totalOmset = 0, totalPiutang = 0, totalBebanKeluarManual = 0;
    
    // Objek Akumulasi Ringkasan Pengeluaran Baru
    let summaryPengeluaran = { "Operasional": 0, "Investasi": 0, "Pendanaan": 0, "Pembelian Alat Inventaris": 0, "Biaya Penyusutan": 0 };

    const tSubPenjualan = document.getElementById("sub-table-penjualan");
    const tSubManual = document.getElementById("sub-table-nontransaksi");
    tSubPenjualan.innerHTML = ""; tSubManual.innerHTML = "";

    const tx = db.transaction(["store_transaksi", "store_cashflow"], "readonly");
    
    tx.objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                totalOmset += v.total;
                totalPiutang += v.sisa_tagihan;

                // SUB 1: Isi Tabel Penjualan Kasir
                const tr = document.createElement("tr");
                tr.className = "border-b border-white/5";
                tr.innerHTML = `
                    <td class="py-2">${v.tgl_pesan}</td>
                    <td>#TRX-${v.id_transaksi}</td>
                    <td>${v.nama_produk} (${v.variant_style})</td>
                    <td>${v.platform}</td>
                    <td class="text-right text-green-400">Rp ${v.total.toLocaleString()}</td>
                    <td class="text-right"><button onclick="hapusTrxKasir(${v.id_transaksi})" class="text-red-400 hover:underline text-[10px]">Hapus</button></td>
                `;
                tSubPenjualan.appendChild(tr);
            }
            cursor.continue();
        }
    };

    tx.objectStore("store_cashflow").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                if(v.jenis === "Keluar") {
                    totalBebanKeluarManual += v.nominal;
                    if(summaryPengeluaran[v.kategori] !== undefined) {
                        summaryPengeluaran[v.kategori] += v.nominal;
                    }
                }

                // SUB 2: Isi Tabel Kas Non-Transaksi
                const tr = document.createElement("tr");
                tr.className = "border-b border-white/5 text-xs";
                tr.innerHTML = `
                    <td class="py-2 font-mono">${v.tanggal}</td>
                    <td class="text-blue-300">${v.kategori}</td>
                    <td class="${v.jenis==='Masuk'?'text-green-400':'text-red-400'} font-bold">${v.jenis}</td>
                    <td class="font-mono">Rp ${v.nominal.toLocaleString()}</td>
                    <td class="text-gray-400 max-w-xs truncate">${v.keterangan}</td>
                    <td class="text-right"><button onclick="hapusCashflowManual(${v.id_flow})" class="text-red-400 hover:underline text-[10px]">Hapus</button></td>
                `;
                tSubManual.appendChild(tr);
            }
            cursor.continue();
        }
    };

    tx.oncomplete = function() {
        // Laba bersih riil = Kas masuk kotor - Beban Akumulasi Keluar
        let netProfitReal = totalOmset - totalPiutang - totalBebanKeluarManual;

        document.getElementById("fin-omset").innerText = "Rp " + totalOmset.toLocaleString();
        document.getElementById("fin-piutang").innerText = "Rp " + totalPiutang.toLocaleString();
        document.getElementById("fin-net").innerText = "Rp " + netProfitReal.toLocaleString();

        // SUB 3: Render Ringkasan Tabel Akumulasi Pengeluaran Baru
        const summaryBox = document.getElementById("summary-pengeluaran-box");
        summaryBox.innerHTML = "";
        for (const [key, value] of Object.entries(summaryPengeluaran)) {
            summaryBox.innerHTML += `
                <div class="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                    <span class="text-gray-500 block text-[9px] font-semibold uppercase">${key}</span>
                    <span class="font-mono font-bold text-white block mt-0.5">Rp ${value.toLocaleString()}</span>
                </div>
            `;
        }
    };
}

function hapusTrxKasir(id) {
    if(confirm("Hapus rekam penjualan ini?")) {
        const tx = db.transaction(["store_transaksi"], "readwrite");
        tx.objectStore("store_transaksi").delete(id);
        tx.oncomplete = function() { initApp(); };
    }
}

function hapusCashflowManual(id) {
    if(confirm("Hapus baris jurnal kas operasional ini?")) {
        const tx = db.transaction(["store_cashflow"], "readwrite");
        tx.objectStore("store_cashflow").delete(id);
        tx.oncomplete = function() { initApp(); };
    }
}

// --- MODULE F: GRAPH CORE SYSTEM ---
let chartOmsetInstance, chartPlatformInstance;
function initChartCore() {
    const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8e8e93' } } } };
    chartOmsetInstance = new Chart(document.getElementById("chart-omset"), { type: 'bar', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], datasets: [{ label: 'Omset Bulanan', backgroundColor: '#396399', data: Array(12).fill(0) }] }, options: opts });
    chartPlatformInstance = new Chart(document.getElementById("chart-platform"), { type: 'doughnut', data: { labels: ['WhatsApp', 'Shopee', 'TikTok Shop', 'Reseller', 'Grosir'], datasets: [{ backgroundColor: ['#25d366', '#ee4d2d', '#ff0050', '#3498db', '#9b59b6'], data: [0, 0, 0, 0, 0] }] }, options: opts });
    updateChartDataVisual();
}

function updateChartDataVisual() {
    const ctx = getActivePeriode();
    let monthlyOmset = Array(12).fill(0);
    let platformDist = { 'WhatsApp': 0, 'Shopee': 0, 'TikTok Shop': 0, 'Reseller': 0, 'Grosir': 0 };

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.tahun === ctx.tahun) {
                let idx = parseInt(v.bulan) - 1;
                monthlyOmset[idx] += v.total;
                if(v.bulan === ctx.bulan && platformDist[v.platform] !== undefined) {
                    platformDist[v.platform] += v.qty;
                }
            }
            cursor.continue();
        } else {
            chartOmsetInstance.data.datasets[0].data = monthlyOmset; chartOmsetInstance.update();
            chartPlatformInstance.data.datasets[0].data = Object.values(platformDist); chartPlatformInstance.update();
        }
    };
}

// --- OUTPUT REAL OPERASIONAL: REAL THERMAL PREVIEW MODAL ---
function bukaModalPratinjauStruk(id) {
    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").get(id).onsuccess = function(e) {
        const v = e.target.result;
        if(!v) return;
        const area = document.getElementById("print-modal");
        area.innerHTML = `
            <div style="text-align:center; font-weight:bold; font-size:14px;">CLOTHVERS SYSTEM</div>
            <div style="text-align:center;">Premium Apparel Supply</div>
            <hr style="border-top:1px dashed #000; margin:6px 0;">
            <div>ID NOTA : #TRX-${v.id_transaksi}</div>
            <div>Tgl Order: ${v.tgl_pesan}</div>
            <div>Est Ready: ${v.tgl_estimasi}</div>
            <div>Platform : ${v.platform}</div>
            <hr style="border-top:1px dashed #000; margin:6px 0;">
            <div style="font-weight:bold;">${v.nama_produk}</div>
            <div style="font-size:10px;">Varian: ${v.variant_style}</div>
            <div style="display:flex; justify-content:space-between;"><span>Vol: ${v.qty} Pcs</span></div>
            <hr style="border-top:1px dashed #000; margin:6px 0;">
            <div style="display:flex; justify-content:space-between;"><span>Diskon:</span><span>Rp ${v.diskon.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Ongkir:</span><span>Rp ${v.ongkir.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>Grand Total:</span><span>Rp ${v.total.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; color:#333;"><span>DP Masuk:</span><span>Rp ${v.dp_masuk.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:red;"><span>Sisa Tagihan:</span><span>Rp ${v.sisa_tagihan.toLocaleString()}</span></div>
            <hr style="border-top:1px dashed #000; margin:6px 0;">
            <div style="text-align:center; font-size:9px;">Dokumen ERP Valid - Simpan Sebagai Garansi PO</div>
        `;
        document.getElementById("modal-container-receipt").classList.remove("hidden");
    };
}

function closeReceiptModal() {
    document.getElementById("modal-container-receipt").classList.add("hidden");
}

// --- DATA EXPORT PACKS ---
function eksporCSV() {
    const ctx = getActivePeriode();
    let csv = "data:text/csv;charset=utf-8,Tanggal,Kategori,Jenis,Nominal,Keterangan\n";
    db.transaction(["store_cashflow"], "readonly").objectStore("store_cashflow").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) csv += `${v.tanggal},${v.kategori},${v.jenis},${v.nominal},"${v.keterangan}"\n`;
            cursor.continue();
        } else {
            const el = document.createElement("a"); el.setAttribute("href", encodeURI(csv)); el.setAttribute("download", `ERP_Finance_${ctx.bulan}_${ctx.tahun}.csv`); el.click();
        }
    };
}

function eksporPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const ctx = getActivePeriode();
    doc.text(`LAPORAN ARUS KAS INTERNAL CLOTHVERS SYSTEM`, 14, 15);
    doc.text(`Periode: ${ctx.bulan}/${ctx.tahun}`, 14, 23);
    let rows = [];
    db.transaction(["store_cashflow"], "readonly").objectStore("store_cashflow").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) rows.push([v.tanggal, v.kategori, v.jenis, `Rp ${v.nominal.toLocaleString()}`, v.keterangan]);
            cursor.continue();
        } else {
            doc.autoTable({ head: [['Tanggal', 'Akun Kategori', 'Arus', 'Nominal', 'Memo']], body: rows, startY: 30 });
            doc.save(`Laporan_ERP_${ctx.bulan}_${ctx.tahun}.pdf`);
        }
    };
}
