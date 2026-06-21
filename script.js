// --- GLOBAL CORE INITALIZATION & DATABASE MANAGEMENT ---
let db;
const dbName = "ClothvershDB";

// Mengunci inisialisasi Object Stores di Browser Lokal
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

request.onerror = function() {
    console.error("Gagal mendirikan IndexedDB lokal.");
};

// --- REAL-TIME DATA MANAGEMENT ROUTINES ---
function getActivePeriode() {
    return {
        bulan: document.getElementById("filter-bulan").value,
        tahun: document.getElementById("filter-tahun").value
    };
}

function initApp() {
    renderStokTable();
    syncDropdownProdukPOS();
    renderPOSTable();
    renderReturTable();
    renderFinanceDashboard();
    initChartCore();

    // Event listener filtering global periodik
    document.getElementById("filter-bulan").addEventListener("change", reloadedFilterContext);
    document.getElementById("filter-tahun").addEventListener("change", reloadedFilterContext);
}

function reloadedFilterContext() {
    renderPOSTable();
    renderFinanceDashboard();
    renderReturTable();
    updateChartDataVisual();
}

// --- TAB SWITCHER ENGINE ---
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

    // Map Title Topbar
    const mapTitles = { stok: 'Input Stok Pakaian', hpp: 'Kalkulasi HPP & Rekomendasi Harga', pos: 'Mesin Kasir / POS', retur: 'Modul Retur & Barang Cacat', finance: 'Laporan Keuangan Cashflow', analytics: 'Analisis Grafik Chart.js' };
    document.getElementById("current-tab-title").innerText = mapTitles[target];
}

// --- MODULE A: STOK & INVENTORY LOGIC ---
document.getElementById("form-stok").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("stok-id").value;
    const item = {
        nama: document.getElementById("stok-nama").value,
        warna: document.getElementById("stok-warna").value,
        kain: document.getElementById("stok-kain").value,
        size: document.getElementById("stok-size").value,
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
    
    if(id) {
        item.id = parseInt(id);
        store.put(item);
    } else {
        store.add(item);
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
            tr.className = "border-b border-white/5 hover:bg-white/[0.02]";
            tr.innerHTML = `
                <td class="py-3">
                    <span class="font-semibold text-white block">${v.nama}</span>
                    <span class="text-[10px] text-gray-400 block">${v.warna} | Kain: ${v.kain} | Size: <b class="text-[#396399]">${v.size}</b></span>
                </td>
                <td class="py-3 text-gray-400 font-mono text-[11px]">
                    LD:${v.ld} PB:${v.pb}<br>PL:${v.pl} LK:${v.lk}
                </td>
                <td class="py-3 text-center">
                    <input type="number" value="${v.qty}" onchange="forceStockOpname(${v.id}, this.value)" class="w-14 bg-[#2c2c2e] border border-white/5 text-center text-xs rounded p-1 font-mono text-amber-400">
                </td>
                <td class="py-3 font-mono">
                    <span class="text-xs block text-gray-400">H: Rp ${v.hpp.toLocaleString()}</span>
                    <span class="text-xs block text-green-400">J: Rp ${v.jual.toLocaleString()}</span>
                </td>
                <td class="py-3 text-right space-x-1">
                    <button onclick="loadEditStok(${v.id})" class="px-2 py-1 bg-white/5 text-[10px] rounded hover:bg-white/10">Edit</button>
                    <button onclick="hapusStok(${v.id})" class="px-2 py-1 bg-red-900/40 text-[10px] rounded hover:bg-red-800/60 text-red-300">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function forceStockOpname(id, val) {
    const tx = db.transaction(["store_produk"], "readwrite");
    const store = tx.objectStore("store_produk");
    store.get(id).onsuccess = function(e) {
        const data = e.target.result;
        data.qty = parseInt(val) || 0;
        store.put(data);
    };
}

function loadEditStok(id) {
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(id).onsuccess = function(e) {
        const v = e.target.result;
        document.getElementById("stok-id").value = v.id;
        document.getElementById("stok-nama").value = v.nama;
        document.getElementById("stok-warna").value = v.warna;
        document.getElementById("stok-kain").value = v.kain;
        document.getElementById("stok-size").value = v.size;
        document.getElementById("stok-qty").value = v.qty;
        document.getElementById("stok-ld").value = v.ld;
        document.getElementById("stok-pb").value = v.pb;
        document.getElementById("stok-pl").value = v.pl;
        document.getElementById("stok-lk").value = v.lk;
        document.getElementById("stok-hpp").value = v.hpp;
        document.getElementById("stok-jual").value = v.jual;
    };
}

function hapusStok(id) {
    if(confirm("Apakah Anda yakin menghapus aset produk ini?")) {
        const tx = db.transaction(["store_produk"], "readwrite");
        tx.objectStore("store_produk").delete(id);
        tx.oncomplete = function() { renderStokTable(); syncDropdownProdukPOS(); };
    }
}

// --- MODULE B: SIMULASI MANUFAKTUR HPP REKOMENDASI ---
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

    // Multi Channel Matrix Calculation
    document.getElementById("chan-wa").innerText = "Rp " + Math.round(hargaBasic).toLocaleString();
    document.getElementById("chan-shopee").innerText = "Rp " + Math.round(hargaBasic / (1 - 0.06)).toLocaleString();
    document.getElementById("chan-tiktok").innerText = "Rp " + Math.round(hargaBasic / (1 - 0.075)).toLocaleString();
    document.getElementById("chan-reseller").innerText = "Rp " + Math.round(hargaBasic * 0.85).toLocaleString();
    document.getElementById("chan-grosir").innerText = "Rp " + Math.round(hargaBasic * 0.75).toLocaleString();
}

// --- MODULE C: MESIN POS KASIR DENGAN ATURAN BISNIS ---
function syncDropdownProdukPOS() {
    const select = document.getElementById("pos-produk");
    const selectRetur = document.getElementById("retur-produk");
    select.innerHTML = ""; selectRetur.innerHTML = "";
    
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            const option = `<option value="${v.id}">${v.nama} [${v.warna} - ${v.size}] (Stok: ${v.qty})</option>`;
            select.innerHTML += option;
            selectRetur.innerHTML += option;
            cursor.continue();
        }
    };
}

// Logika Input Sisa Tagihan Otomatis Berdasarkan Status Termin
document.getElementById("pos-status-bayar").addEventListener("change", calculateLivePOSGrandTotal);
document.getElementById("pos-diskon").addEventListener("input", calculateLivePOSGrandTotal);
document.getElementById("pos-ongkir").addEventListener("input", calculateLivePOSGrandTotal);
document.getElementById("pos-qty").addEventListener("input", calculateLivePOSGrandTotal);
document.getElementById("pos-komplimen").addEventListener("change", calculateLivePOSGrandTotal);
document.getElementById("pos-produk").addEventListener("change", calculateLivePOSGrandTotal);

function calculateLivePOSGrandTotal() {
    const pId = parseInt(document.getElementById("pos-produk").value);
    if (!pId) return;

    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(pId).onsuccess = function(e) {
        const prod = e.target.result;
        const qty = parseInt(document.getElementById("pos-qty").value) || 1;
        const diskon = parseFloat(document.getElementById("pos-diskon").value) || 0;
        const ongkir = parseFloat(document.getElementById("pos-ongkir").value) || 0;
        const isKomplimen = document.getElementById("pos-komplimen").checked;
        const status = document.getElementById("pos-status-bayar").value;

        let basePrice = isKomplimen ? 0 : prod.jual;
        let total = (basePrice * qty) - diskon + ongkir;
        if (total < 0) total = 0;

        let sisa = 0;
        if (status === "DP") {
            sisa = total * 0.5; // Contoh Rule: DP mengunci sisa 50%
        } else if (status === "Piutang") {
            sisa = total;
        }

        document.getElementById("pos-sisa").value = sisa;
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
    const pSisa = parseFloat(document.getElementById("pos-sisa").value) || 0;
    
    const pExp = document.getElementById("pos-ekspedisi").value;
    const pResi = document.getElementById("pos-resi").value;

    const ctxTime = getActivePeriode();
    const now = new Date();
    const tglString = `${now.getDate()}/${ctxTime.bulan}/${ctxTime.tahun}`;

    const tx = db.transaction(["store_produk", "store_transaksi", "store_cashflow"], "readwrite");
    
    tx.objectStore("store_produk").get(pId).onsuccess = function(evt) {
        const prod = evt.target.result;
        if(prod.qty < pQty) {
            alert("Ambang batas stok fisik tidak mencukupi untuk memproses transaksi!");
            return;
        }

        // Potong stok inventory
        prod.qty -= pQty;
        tx.objectStore("store_produk").put(prod);

        // Hitung Grand Total Finansial
        let totalJualItem = isKomplimen ? 0 : (prod.jual * pQty);
        let grandTotal = totalJualItem - pDiskon + pOngkir;
        if(grandTotal < 0) grandTotal = 0;

        // Simpan Log Transaksi ERP
        const transaksi = {
            tanggal: tglString, bulan: ctxTime.bulan, tahun: ctxTime.tahun,
            produk_id: pId, nama_produk: prod.nama, variant_style: `${prod.warna} [${prod.size}]`,
            qty: pQty, total: grandTotal, diskon: pDiskon, ongkir: pOngkir,
            ekspedisi: pExp, resi: pResi, status_bayar: pStatus, sisa_tagihan: pSisa,
            platform: pPlatform, hpp_total: (prod.hpp * pQty)
        };
        tx.objectStore("store_transaksi").add(transaksi);

        // Logika Finansial Cashflow Akuntansi
        if(isKomplimen) {
            // Komplimen melemparkan seluruh HPP baju ke Beban Marketing
            const flowMarketing = {
                tanggal: tglString, bulan: ctxTime.bulan, tahun: ctxTime.tahun,
                kategori: "Operasional", jenis: "Keluar", nominal: (prod.hpp * pQty),
                keterangan: `[Beban Marketing] Komplimen BA / Hubungan Publik: ${prod.nama}`
            };
            tx.objectStore("store_cashflow").add(flowMarketing);
        } else {
            // Transaksi Normal Masuk Kas Bersih (Dikurangi sisa piutang tertahan)
            const kasMasukReal = grandTotal - pSisa;
            if (kasMasukReal > 0) {
                const flowKas = {
                    tanggal: tglString, bulan: ctxTime.bulan, tahun: ctxTime.tahun,
                    kategori: "Operasional", jenis: "Masuk", nominal: kasMasukReal,
                    keterangan: `[Penjualan POS] ${pPlatform} - ${prod.nama} (${pStatus})`
                };
                tx.objectStore("store_cashflow").add(flowKas);
            }
        }
    };

    tx.oncomplete = function() {
        document.getElementById("form-pos").reset();
        renderStokTable();
        syncDropdownProdukPOS();
        renderPOSTable();
        renderFinanceDashboard();
        updateChartDataVisual();
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
                    <td class="py-3 font-mono text-gray-400">#TRX-${v.id_transaksi}<br><span class="text-[9px]">${v.tanggal}</span></td>
                    <td class="py-3"><b class="text-white">${v.nama_produk}</b><br><span class="text-gray-500">${v.variant_style} (${v.platform})</span></td>
                    <td class="py-3 text-center font-mono">${v.qty}</td>
                    <td class="py-3 font-mono text-green-400">Rp ${v.total.toLocaleString()}</td>
                    <td class="py-3">
                        <span class="px-1.5 py-0.5 rounded text-[9px] ${v.status_bayar==='Lunas'?'bg-green-900/40 text-green-300':'bg-amber-900/40 text-amber-300'}">${v.status_bayar}</span>
                    </td>
                    <td class="py-3 text-right space-x-1">
                        <button onclick="cetakStokThermal(${v.id_transaksi})" class="px-2 py-0.5 bg-white/5 rounded hover:bg-white/10">Struk</button>
                        <button onclick="kirimNotaWhatsApp(${v.id_transaksi})" class="px-2 py-0.5 bg-green-900 text-green-200 rounded hover:bg-green-800">WA</button>
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
    const now = new Date();
    const tglString = `${now.getDate()}/${ctx.bulan}/${ctx.tahun}`;

    const tx = db.transaction(["store_produk", "store_retur_po", "store_cashflow"], "readwrite");

    tx.objectStore("store_produk").get(pId).onsuccess = function(evt) {
        const prod = evt.target.result;

        if (rJenis === "Tukar Size") {
            // Mengembalikan unit pakaian lama ke wadah inventori gudang
            prod.qty += rQty;
        } else if (rJenis === "Cacat") {
            // Membuang dari inventori fisik gudang dan melempar kerugian ke arus kas
            prod.qty -= rQty;
            if(rRugi > 0) {
                const flowRugi = {
                    tanggal: tglString, bulan: ctx.bulan, tahun: ctx.tahun,
                    kategori: "Operasional", jenis: "Keluar", nominal: rRugi,
                    keterangan: `[Kerugian Defek Manufaktur] Cacat Konveksi Reject: ${prod.nama}`
                };
                tx.objectStore("store_cashflow").add(flowRugi);
            }
        }
        tx.objectStore("store_produk").put(prod);

        const returLog = {
            tanggal: tglString, bulan: ctx.bulan, tahun: ctx.tahun,
            jenis: rJenis, produk_id: pId, nama_produk: prod.nama, qty: rQty, nominal_rugi: rRugi
        };
        tx.objectStore("store_retur_po").add(returLog);
    };

    tx.oncomplete = function() {
        document.getElementById("form-retur").reset();
        renderStokTable();
        syncDropdownProdukPOS();
        renderReturTable();
        renderFinanceDashboard();
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
                tr.className = "border-b border-white/5 hover:bg-white/[0.02]";
                tr.innerHTML = `
                    <td class="py-3 font-mono text-gray-500">#RET-${v.id_retur}</td>
                    <td class="py-3 font-medium text-amber-400">${v.jenis}</td>
                    <td class="py-3 text-white">${v.nama_produk}</td>
                    <td class="py-3 text-center font-mono">${v.qty}</td>
                    <td class="py-3 text-right font-mono text-red-400">Rp ${v.nominal_rugi.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

// --- MODULE E: JURNAL NON-TRANSAKSI CASHFLOW & FINANCE ---
document.getElementById("form-cashflow").addEventListener("submit", function(e) {
    e.preventDefault();
    const ctx = getActivePeriode();
    const now = new Date();
    const tglString = `${now.getDate()}/${ctx.bulan}/${ctx.tahun}`;

    const flow = {
        tanggal: tglString, bulan: ctx.bulan, tahun: ctx.tahun,
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
        updateChartDataVisual();
    };
});

function renderFinanceDashboard() {
    const ctx = getActivePeriode();
    let totalOmset = 0;
    let totalHPP = 0;
    let totalKasMasuk = 0;
    let totalKasKeluar = 0;

    const tx = db.transaction(["store_transaksi", "store_cashflow"], "readonly");
    
    tx.objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                totalOmset += v.total;
                totalHPP += v.hpp_total;
            }
            cursor.continue();
        }
    };

    tx.objectStore("store_cashflow").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                if(v.jenis === "Masuk") totalKasMasuk += v.nominal;
                if(v.jenis === "Keluar") totalKasKeluar += v.nominal;
            }
            cursor.continue();
        }
    };

    tx.oncomplete = function() {
        // Render tabel ledger/jurnal
        const tbody = document.getElementById("table-cashflow-body");
        tbody.innerHTML = "";
        
        db.transaction(["store_cashflow"], "readonly").objectStore("store_cashflow").openCursor().onsuccess = function(evt) {
            const cursor = evt.target.result;
            if(cursor) {
                const v = cursor.value;
                if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                    const tr = document.createElement("tr");
                    tr.className = "border-b border-white/5 text-[11px]";
                    tr.innerHTML = `
                        <td class="py-2.5 font-mono text-gray-500">${v.tanggal}</td>
                        <td class="py-2.5 text-gray-400">${v.kategori}</td>
                        <td class="py-2.5 font-semibold ${v.jenis==='Masuk'?'text-green-400':'text-red-400'}">${v.jenis}</td>
                        <td class="py-2.5 font-mono">Rp ${v.nominal.toLocaleString()}</td>
                        <td class="py-2.5 text-gray-300 max-w-xs truncate">${v.keterangan}</td>
                    `;
                    tbody.appendChild(tr);
                }
                cursor.continue();
            }
        };

        // Laba bersih = Omset kotor - Beban Operasional Keluar
        let netProfit = totalOmset - totalHPP - totalKasKeluar + totalKasMasuk;

        document.getElementById("fin-omset").innerText = "Rp " + totalOmset.toLocaleString();
        document.getElementById("fin-hpp").innerText = "Rp " + totalHPP.toLocaleString();
        document.getElementById("fin-net").innerText = "Rp " + netProfit.toLocaleString();
    };
}

// --- MODULE F: VISUALISASI CHART CORE (CHART.JS) ---
let chartOmsetInstance, chartPlatformInstance, chartSizeInstance;

function initChartCore() {
    const optGlobal = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8e8e93', font: { family: 'Plus Jakarta Sans' } } } } };

    chartOmsetInstance = new Chart(document.getElementById("chart-omset"), {
        type: 'bar',
        data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], datasets: [{ label: 'Omset Bulanan', backgroundColor: '#396399', data: Array(12).fill(0) }] },
        options: optGlobal
    });

    chartPlatformInstance = new Chart(document.getElementById("chart-platform"), {
        type: 'doughnut',
        data: { labels: ['WhatsApp', 'Shopee', 'TikTok Shop', 'Reseller', 'Grosir'], datasets: [{ backgroundColor: ['#25d366', '#ee4d2d', '#ff0050', '#3498db', '#9b59b6'], data: [0, 0, 0, 0, 0] }] },
        options: optGlobal
    });

    chartSizeInstance = new Chart(document.getElementById("chart-size"), {
        type: 'line',
        data: { labels: ['S', 'M', 'L', 'XL', 'XXL'], datasets: [{ label: 'Varian Size Terlaris', borderColor: '#34c759', data: [0, 0, 0, 0, 0], fill: false, tension: 0.3 }] },
        options: optGlobal
    });

    updateChartDataVisual();
}

function updateChartDataVisual() {
    const ctx = getActivePeriode();
    let monthlyOmsetArray = Array(12).fill(0);
    let platformDistribution = { 'WhatsApp': 0, 'Shopee': 0, 'TikTok Shop': 0, 'Reseller': 0, 'Grosir': 0 };
    let sizeDistribution = { 'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XXL': 0 };

    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.tahun === ctx.tahun) {
                let mIdx = parseInt(v.bulan) - 1;
                monthlyOmsetArray[mIdx] += v.total;

                if(v.bulan === ctx.bulan) {
                    if(platformDistribution[v.platform] !== undefined) platformDistribution[v.platform] += v.qty;
                    
                    // Ekstraksi distribusi ukuran baju dari master_produk melalui cache log
                    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(v.produk_id).onsuccess = function(ev) {
                        const pr = ev.target.result;
                        if(pr && sizeDistribution[pr.size] !== undefined) {
                            sizeDistribution[pr.size] += v.qty;
                            chartSizeInstance.data.datasets[0].data = Object.values(sizeDistribution);
                            chartSizeInstance.update();
                        }
                    };
                }
            }
            cursor.continue();
        } else {
            chartOmsetInstance.data.datasets[0].data = monthlyOmsetArray;
            chartOmsetInstance.update();

            chartPlatformInstance.data.datasets[0].data = Object.values(platformDistribution);
            chartPlatformInstance.update();
        }
    };
}

// --- HARD OPERATIONS OUTPUT: STRUK, WHATSAPP & EKSPOR ---
function cetakStokThermal(id) {
    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").get(id).onsuccess = function(e) {
        const v = e.target.result;
        const area = document.getElementById("print-receipt-area");
        area.innerHTML = `
            <div style="text-align:center; font-weight:bold;">CLOTHVERSH APPAREL</div>
            <div style="text-align:center; font-size:10px;">Medan, Indonesia</div>
            <hr style="border-top:1px dashed #000; margin:5px 0;">
            <div>ID Nota : #TRX-${v.id_transaksi}</div>
            <div>Tanggal : ${v.tanggal}</div>
            <div>Platform: ${v.platform}</div>
            <hr style="border-top:1px dashed #000; margin:5px 0;">
            <div style="display:flex; justify-content:between;">
                <span>${v.nama_produk} x ${v.qty}</span>
            </div>
            <div style="font-size:10px; color:#555;">Varian: ${v.variant_style}</div>
            <hr style="border-top:1px dashed #000; margin:5px 0;">
            <div>Diskon: Rp ${v.diskon.toLocaleString()}</div>
            <div>Ongkir: Rp ${v.ongkir.toLocaleString()}</div>
            <div style="font-weight:bold;">Grand Total: Rp ${v.total.toLocaleString()}</div>
            <div>Termin: ${v.status_bayar}</div>
            <hr style="border-top:1px dashed #000; margin:5px 0;">
            <div style="text-align:center; font-size:10px;">Terima Kasih Atas Kunjungan Anda</div>
        `;
        window.print();
    };
}

function kirimNotaWhatsApp(id) {
    db.transaction(["store_transaksi"], "readonly").objectStore("store_transaksi").get(id).onsuccess = function(e) {
        const v = e.target.result;
        const teks = `Halo, Terima kasih telah berbelanja di *Clothversh*!\nBerikut rincian nota belanja Anda:\n\n*ID NOTA:* #TRX-${v.id_transaksi}\n*Item:* ${v.nama_produk} (${v.variant_style})\n*Jumlah:* ${v.qty} Pcs\n*Logistik:* ${v.ekspedisi || '-'}\n*No. Resi:* ${v.resi || '-'}\n\n*Total Bayar:* Rp ${v.total.toLocaleString()}\n*Status Termin:* ${v.status_bayar}\n\nSistem Automasi ERP Clothversh.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(teks)}`, '_blank');
    };
}

function eksporCSV() {
    const ctx = getActivePeriode();
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Kategori,Jenis,Nominal,Keterangan\n";
    
    db.transaction(["store_cashflow"], "readonly").objectStore("store_cashflow").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                csvContent += `${v.tanggal},${v.kategori},${v.jenis},${v.nominal},"${v.keterangan}"\n`;
            }
            cursor.continue();
        } else {
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Laporan_Cashflow_${ctx.bulan}_${ctx.tahun}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
}

function eksporPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const ctx = getActivePeriode();

    doc.text(`LAPORAN KEUANGAN RESMI CLOTHVERSH`, 14, 15);
    doc.text(`Periode Penjualan Bulan: ${ctx.bulan} - Tahun: ${ctx.tahun}`, 14, 23);

    let rows = [];
    db.transaction(["store_cashflow"], "readonly").objectStore("store_cashflow").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.bulan === ctx.bulan && v.tahun === ctx.tahun) {
                rows.push([v.tanggal, v.kategori, v.jenis, `Rp ${v.nominal.toLocaleString()}`, v.keterangan]);
            }
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Tanggal', 'Kategori', 'Arus Kas', 'Nominal', 'Memo Keterangan']],
                body: rows,
                startY: 30,
            });
            doc.save(`ERP_Clothversh_Release_${ctx.bulan}_${ctx.tahun}.pdf`);
        }
    };
}
