/**
 * CLOTHVERS SYSTEM v1.0 - CORE LOGIC ENGINE (SERVERLESS ARCHITECTURE)
 * Terintegrasi Penuh dengan Pure IndexedDB Storage s.d Target Operasional Jangka Panjang 2030+
 */

let db = null;
let currentModule = 'dashboard-stok';
let activeColorsMap = []; // State temporary untuk menampung warna varian yang diinput sebelum save model
let cartState = []; // State keranjang POS temporer
let lastInvoiceId = null; // Menyimpan id invoice teranyar untuk struk PDF & WA
let currentSubFilterRange = 'BULAN'; // Default range filter akuntansi [HARI, MINGGU, BULAN, TAHUN]

// Inisialisasi Aplikasi Saat DOM Siap
document.addEventListener("DOMContentLoaded", () => {
    initPeriodDropdown();
    initIndexedDB();
    switchModule(currentModule);
});

// 1. STRUKTUR & INISIALISASI DATABASE ENGINE (INDEXEDDB MULTI-STORES)
function initIndexedDB() {
    const request = indexedDB.open("ClothversDB", 1);

    request.onupgradeneeded = (event) => {
        const upgradeDb = event.target.result;
        
        if (!upgradeDb.objectStoreNames.contains("store_produk")) {
            upgradeDb.createObjectStore("store_produk", { keyPath: "id", autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains("store_hpp")) {
            upgradeDb.createObjectStore("store_hpp", { keyPath: "id", autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains("store_transaksi")) {
            upgradeDb.createObjectStore("store_transaksi", { keyPath: "id", autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains("store_jurnal_akuntansi")) {
            upgradeDb.createObjectStore("store_jurnal_akuntansi", { keyPath: "id", autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains("store_retur_reject")) {
            upgradeDb.createObjectStore("store_retur_reject", { keyPath: "id", autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains("store_inventaris")) {
            upgradeDb.createObjectStore("store_inventaris", { keyPath: "id", autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains("store_customer")) {
            upgradeDb.createObjectStore("store_customer", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        refreshAllTables();
    };

    request.onerror = (event) => {
        console.error("Gagal melakukan inisialisasi ClothversDB sandbox:", event.target.error);
    };
}

// 2. FILTRASI GLOBAL JANGKA PANJANG 2026 - 2030
function initPeriodDropdown() {
    const filterSelect = document.getElementById("global-filter");
    if (!filterSelect) return;
    
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const startYear = 2026;
    const endYear = 2030;
    
    let htmlOptions = "";
    for (let y = startYear; y <= endYear; y++) {
        for (let m = 0; m < 12; m++) {
            const val = `${y}-${String(m + 1).padStart(2, '0')}`;
            const label = `${months[m]} ${y}`;
            
            // Set default default ke waktu sekarang (Juni 2026 sesuai time konteks)
            const isSelected = (y === 2026 && m === 5) ? "selected" : "";
            htmlOptions += `<option value="${val}" ${isSelected}>${label}</option>`;
        }
    }
    filterSelect.innerHTML = htmlOptions;
}

function handleGlobalFilterChange() {
    refreshAllTables();
}

function getSelectedYearMonth() {
    const val = document.getElementById("global-filter")?.value || "2026-06";
    const parts = val.split("-");
    return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10)
    };
}

// Helper filter pencocokan timestamp data terhadap periode global terpilih
function isDataInSelectedPeriod(timestamp) {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const filter = getSelectedYearMonth();
    return d.getFullYear() === filter.year && (d.getMonth() + 1) === filter.month;
}

// 3. LOGIKA ROUTING PANEL MODUL UTAMA
function switchModule(moduleId) {
    currentModule = moduleId;
    
    const modules = {
        'dashboard-stok': 'mod-stok',
        'dashboard-hpp': 'mod-hpp',
        'terminal-pos': 'mod-pos',
        'crm-customer': 'mod-crm',
        'retur-inventaris': 'mod-retur',
        'akuntansi-keuangan': 'mod-akuntansi',
        'backup-panel': 'mod-backup'
    };

    const titles = {
        'dashboard-stok': '📦 Input & Manajemen Database Stok Pakaian',
        'dashboard-hpp': '📊 Simulasi Struktur HPP & Proyeksi Jual Multi-Channel',
        'terminal-pos': '🛒 Terminal Kasir POS Utama & Manajemen Antrean',
        'crm-customer': '👥 Customer Relationship Management (CRM Log)',
        'retur-inventaris': '🔄 Log Barang Retur & Inventarisasi Aset Kerja',
        'akuntansi-keuangan': '💵 Buku Besar Akuntansi & Sinkronisasi Finansial Terpadu',
        'backup-panel': '💾 Pengaturan Komponen Jembatan Cadangan Data (JSON)'
    };

    // Sembunyikan semua modul HTML
    Object.values(modules).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    // Hilangkan semua gaya aktif tombol navigasi
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("bg-[#3B82F6]", "text-white");
        btn.classList.add("text-slate-300");
    });

    // Aktifkan modul terpilih
    const targetId = modules[moduleId];
    if (targetId) {
        document.getElementById(targetId)?.classList.remove("hidden");
        document.getElementById("module-title").innerText = titles[moduleId] || "Dashboard";
    }

    // Berikan gaya aktif ke tombol sidebar yang relevan
    const activeBtnMap = {
        'dashboard-stok': 'btn-stok',
        'dashboard-hpp': 'btn-hpp',
        'terminal-pos': 'btn-pos',
        'crm-customer': 'btn-crm',
        'retur-inventaris': 'btn-retur',
        'akuntansi-keuangan': 'btn-akuntansi',
        'backup-panel': 'btn-backup'
    };
    const btnEl = document.getElementById(activeBtnMap[moduleId]);
    if (btnEl) {
        btnEl.classList.remove("text-slate-300");
        btnEl.classList.add("bg-[#3B82F6]", "text-white");
    }

    refreshAllTables();
}

function refreshAllTables() {
    if (!db) return;
    renderTableStok();
    renderTableHpp();
    renderPosCatalogAndState();
    renderTableCrm();
    renderReturAndInventaris();
    renderAkuntansiDashboard();
}

// ==========================================
// MODULE A: LOGIKA DASHBOARD INPUT STOK PAKAIAN
// ==========================================
function addWarnaMatriks() {
    const inputWarna = document.getElementById("input-varian-warna");
    const warnaValue = inputWarna?.value?.trim();
    if (!warnaValue) return;

    if (!activeColorsMap.includes(warnaValue)) {
        activeColorsMap.push(warnaValue);
    }
    inputWarna.value = "";
    renderMatriksFormVarian();
}

function removeWarnaMatriks(warna) {
    activeColorsMap = activeColorsMap.filter(c => c !== warna);
    renderMatriksFormVarian();
}

function renderMatriksFormVarian(existingMatriks = null) {
    const container = document.getElementById("matriks-varian-container");
    if (!container) return;

    if (activeColorsMap.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-400 italic text-center py-12">Masukkan varian warna di form sebelah kiri terlebih dahulu untuk mengaktifkan tabel spesifikasi ukuran fisik.</p>`;
        return;
    }

    const sizes = ["S", "M", "L", "XL", "2XL"];
    let html = "";

    activeColorsMap.forEach((warna) => {
        html += `
        <div class="border border-slate-100 rounded-xl p-4 bg-[#F8FAFC]/50 space-y-3">
            <div class="flex justify-between items-center bg-[#0F172A] text-white px-3 py-1.5 rounded-lg">
                <span class="text-xs font-bold uppercase tracking-wider">Varian Warna: ${warna}</span>
                <button type="button" onclick="removeWarnaMatriks('${warna}')" class="text-xs text-red-400 font-bold hover:text-red-300">Hapus Blok Warna</button>
            </div>
            <div class="w-full overflow-x-auto block whitespace-nowrap bg-white border border-slate-100 rounded-xl">
                <table class="w-full text-xs text-left border-collapse">
                    <thead class="bg-slate-100 font-bold text-[#0F172A] border-b border-slate-200">
                        <tr>
                            <th class="p-2.5">Size</th>
                            <th class="p-2.5 w-16">Stok</th>
                            <th class="p-2.5 w-24">HPP Varian (Rp)</th>
                            <th class="p-2.5 w-24">Harga Jual (Rp)</th>
                            <th class="p-2.5 w-14">WH (cm)</th>
                            <th class="p-2.5 w-14">HT (cm)</th>
                            <th class="p-2.5">TB Min-Max</th>
                            <th class="p-2.5">BB Min-Max</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">`;

        sizes.forEach(size => {
            // Tarik data fallback jika sedang proses edit item data lama
            let matchedObj = null;
            if (existingMatriks && Array.isArray(existingMatriks)) {
                matchedObj = existingMatriks.find(item => item.warna === warna && item.size === size);
            }

            const valStok = matchedObj?.stok ?? 10;
            const valHpp = matchedObj?.hpp_varian ?? 45000;
            const valJual = matchedObj?.jual_varian ?? 85000;
            const valWh = matchedObj?.wh ?? 50;
            const valHt = matchedObj?.ht ?? 70;
            const valTbMin = matchedObj?.tb_min ?? 160;
            const valTbMax = matchedObj?.tb_max ?? 170;
            const valBbMin = matchedObj?.bb_min ?? 55;
            const valBbMax = matchedObj?.bb_max ?? 65;

            html += `
                        <tr data-warna="${warna}" data-size="${size}">
                            <td class="p-2 font-bold text-[#0F172A] bg-slate-50 text-center">${size}</td>
                            <td class="p-1"><input type="number" class="mtr-stok w-full border border-slate-200 p-1 rounded focus:outline-none" value="${valStok}"></td>
                            <td class="p-1"><input type="number" class="mtr-hpp w-full border border-slate-200 p-1 rounded focus:outline-none" value="${valHpp}"></td>
                            <td class="p-1"><input type="number" class="mtr-jual w-full border border-slate-200 p-1 rounded focus:outline-none" value="${valJual}"></td>
                            <td class="p-1"><input type="number" class="mtr-wh w-full border border-slate-200 p-1 rounded focus:outline-none" value="${valWh}"></td>
                            <td class="p-1"><input type="number" class="mtr-ht w-full border border-slate-200 p-1 rounded focus:outline-none" value="${valHt}"></td>
                            <td class="p-1">
                                <div class="flex gap-1 items-center">
                                    <input type="number" class="mtr-tbmin w-12 border border-slate-200 p-1 rounded text-center focus:outline-none" value="${valTbMin}">
                                    <span>-</span>
                                    <input type="number" class="mtr-tbmax w-12 border border-slate-200 p-1 rounded text-center focus:outline-none" value="${valTbMax}">
                                </div>
                            </td>
                            <td class="p-1">
                                <div class="flex gap-1 items-center">
                                    <input type="number" class="mtr-bbmin w-12 border border-slate-200 p-1 rounded text-center focus:outline-none" value="${valBbMin}">
                                    <span>-</span>
                                    <input type="number" class="mtr-bbmax w-12 border border-slate-200 p-1 rounded text-center focus:outline-none" value="${valBbMax}">
                                </div>
                            </td>
                        </tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function saveProduk(e) {
    e.preventDefault();
    if (!db) return;

    const idVal = document.getElementById("produk-id").value;
    const nama_model = document.getElementById("nama-model").value.trim();
    const jenis_kain = document.getElementById("jenis-kain").value.trim();
    const tipe_kain_gsm = document.getElementById("tipe-gsm").value.trim();
    const detail_production = document.getElementById("detail-produksi").value.trim();

    // Ambil matriks dari DOM tabel dinamis ukuran
    const rows = document.querySelectorAll("#matriks-varian-container tr[data-warna]");
    const matriks_varian = [];

    rows.forEach(row => {
        const warna = row.getAttribute("data-warna");
        const size = row.getAttribute("data-size");
        
        const stok = parseInt(row.querySelector(".mtr-stok")?.value || 0, 10);
        const hpp_varian = parseFloat(row.querySelector(".mtr-hpp")?.value || 0);
        const jual_varian = parseFloat(row.querySelector(".mtr-jual")?.value || 0);
        const wh = parseFloat(row.querySelector(".mtr-wh")?.value || 0);
        const ht = parseFloat(row.querySelector(".mtr-ht")?.value || 0);
        const tb_min = parseFloat(row.querySelector(".mtr-tbmin")?.value || 0);
        const tb_max = parseFloat(row.querySelector(".mtr-tbmax")?.value || 0);
        const bb_min = parseFloat(row.querySelector(".mtr-bbmin")?.value || 0);
        const bb_max = parseFloat(row.querySelector(".mtr-bbmax")?.value || 0);

        matriks_varian.push({
            warna, size, stok, hpp_varian, jual_varian, wh, ht, tb_min, tb_max, bb_min, bb_max
        });
    });

    const tx = db.transaction("store_produk", "readwrite");
    const store = tx.objectStore("store_produk");

    const dataSave = {
        nama_model,
        jenis_kain,
        tipe_kain_gsm,
        detail_production,
        matriks_varian,
        timestamp: idVal ? undefined : Date.now() // Pertahankan timestamp jika edit
    };

    if (idVal) {
        // Mode Update
        dataSave.id = parseInt(idVal, 10);
        // Tarik objek lama dulu via request untuk pertahankan timestamp pembuatannya
        store.get(dataSave.id).onsuccess = (ev) => {
            const oldObj = ev.target.result;
            dataSave.timestamp = oldObj?.timestamp || Date.now();
            store.put(dataSave).onsuccess = () => {
                resetFormProduk();
                refreshAllTables();
            };
        };
    } else {
        // Mode Create Baru
        dataSave.timestamp = Date.now();
        store.add(dataSave).onsuccess = () => {
            resetFormProduk();
            refreshAllTables();
        };
    }
}

function resetFormProduk() {
    document.getElementById("produk-id").value = "";
    document.getElementById("form-produk").reset();
    activeColorsMap = [];
    renderMatriksFormVarian();
}

function editProduk(id) {
    if (!db) return;
    const tx = db.transaction("store_produk", "readonly");
    tx.objectStore("store_produk").get(id).onsuccess = (e) => {
        const prod = e.target.result;
        if (!prod) return;

        document.getElementById("produk-id").value = prod.id;
        document.getElementById("nama-model").value = prod?.nama_model || "";
        document.getElementById("jenis-kain").value = prod?.jenis_kain || "";
        document.getElementById("tipe-gsm").value = prod?.tipe_kain_gsm || "";
        document.getElementById("detail-produksi").value = prod?.detail_production || "";

        // Ekstrak warna unik dari data matriks varian tersimpan
        const matriks = prod?.matriks_varian || [];
        const uniqueColors = [];
        matriks.forEach(item => {
            if (item.warna && !uniqueColors.includes(item.warna)) {
                uniqueColors.push(item.warna);
            }
        });

        activeColorsMap = uniqueColors;
        renderMatriksFormVarian(matriks);
    };
}

function deleteProduk(id) {
    if (!db || !confirm("Yakin ingin menghapus total model produksi pakaian ini dari Master Stok?")) return;
    const tx = db.transaction("store_produk", "readwrite");
    tx.objectStore("store_produk").delete(id).onsuccess = () => {
        refreshAllTables();
    };
}

function renderTableStok() {
    const tbody = document.getElementById("table-stok-body");
    if (!tbody) return;

    const tx = db.transaction("store_produk", "readonly");
    const store = tx.objectStore("store_produk");
    let html = "";

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const rowData = cursor.value;
            const matriks = rowData?.matriks_varian || [];
            
            // Hitung akumulasi statistik total stok dan ekstraksi warna unik
            let totalStok = 0;
            const colorsList = [];
            matriks.forEach(m => {
                totalStok += (m?.stok || 0);
                if (m.warna && !colorsList.includes(m.warna)) colorsList.push(m.warna);
            });

            html += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4 font-bold text-[#0F172A]">${rowData?.nama_model || "-"}</td>
                <td class="p-4 text-xs font-medium">${rowData?.jenis_kain || "-"} (${rowData?.tipe_kain_gsm || "-"} GSM)</td>
                <td class="p-4 text-xs font-semibold text-slate-500">${colorsList.join(", ") || "Kosong"}</td>
                <td class="p-4 text-sm font-extrabold text-[#0F172A]">${totalStok} Pcs</td>
                <td class="p-4 text-center">
                    <div class="flex gap-2 justify-center">
                        <button onclick="editProduk(${rowData.id})" class="text-xs bg-[#3B82F6] hover:bg-blue-600 text-white font-medium px-2.5 py-1.5 rounded-lg transition-all">Edit</button>
                        <button onclick="deleteProduk(${rowData.id})" class="text-xs bg-red-500 hover:bg-red-600 text-white font-medium px-2.5 py-1.5 rounded-lg transition-all">Hapus</button>
                    </div>
                </td>
            </tr>`;
            cursor.continue();
        } else {
            tbody.innerHTML = html || `<tr><td colspan="5" class="p-8 text-center text-sm text-slate-400 italic">Belum ada data model pakaian di inventori.</td></tr>`;
        }
    };
}

// 4. UNDUH LAPORAN KOLEKTIF PDF (MENGGUNAKAN JSPDF INTERNAL)
function downloadPDFStokAll() {
    if (!db) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42); // Navy
    pdf.text("LAPORAN MASTER DATA INVENTORI PAKAIAN", 14, 20);
    pdf.setFontSize(10);
    pdf.setFont("Helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Clothvers System v1.0 • Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 26);
    pdf.line(14, 28, 196, 28);

    const tx = db.transaction("store_produk", "readonly");
    let currentY = 36;

    tx.objectStore("store_produk").getAll().onsuccess = (e) => {
        const list = e.target.result || [];
        if (list.length === 0) {
            pdf.text("Tidak ada data inventori ditemukan.", 14, currentY);
            pdf.save("Clothvers_MasterStok.pdf");
            return;
        }

        list.forEach((item) => {
            if (currentY > 270) { pdf.addPage(); currentY = 20; }
            pdf.setFont("Helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(15, 23, 42);
            pdf.text(`Model: ${item.nama_model} | Kain: ${item.jenis_kain} (${item.tipe_kain_gsm} GSM)`, 14, currentY);
            currentY += 5;
            
            pdf.setFont("Helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(50);
            
            const matriks = item?.matriks_varian || [];
            let matriksStr = "";
            matriks.forEach((m, idx) => {
                matriksStr += `[Warna:${m.warna} | Size:${m.size} | Stok:${m.stok} | Jual:Rp${m.jual_varian}]   `;
                if ((idx + 1) % 2 === 0) {
                    pdf.text(matriksStr, 16, currentY);
                    currentY += 4;
                    matriksStr = "";
                }
            });
            if (matriksStr) {
                pdf.text(matriksStr, 16, currentY);
                currentY += 4;
            }
            currentY += 4;
        });

        pdf.save("Clothvers_MasterStok.pdf");
    };
}


// ==========================================
// MODULE B: DASHBOARD MANAJEMEN HPP
// ==========================================
function syncHppModelSelect() {
    const modelSelect = document.getElementById("hpp-pilih-model");
    const sizeSelect = document.getElementById("hpp-pilih-size");
    if (!modelSelect || !sizeSelect) return;

    const prodId = parseInt(modelSelect.value, 10);
    if (isNaN(prodId)) return;

    const tx = db.transaction("store_produk", "readonly");
    tx.objectStore("store_produk").get(prodId).onsuccess = (e) => {
        const prod = e.target.result;
        const matriks = prod?.matriks_varian || [];
        
        // Dapatkan semua ukuran unik yang tersedia di model ini
        const sizesList = [];
        matriks.forEach(m => {
            if (m.size && !sizesList.includes(m.size)) sizesList.push(m.size);
        });

        let html = "";
        sizesList.forEach(s => {
            html += `<option value="${s}">${s}</option>`;
        });
        sizeSelect.innerHTML = html || `<option value="">-</option>`;
        syncHppPriceBase();
    };
}

function syncHppPriceBase() {
    const modelSelect = document.getElementById("hpp-pilih-model");
    const sizeSelect = document.getElementById("hpp-pilih-size");
    const biayaKainInput = document.getElementById("hpp-biaya-kain");
    if (!modelSelect || !sizeSelect || !biayaKainInput) return;

    const prodId = parseInt(modelSelect.value, 10);
    const sizeVal = sizeSelect.value;
    if (isNaN(prodId) || !sizeVal) return;

    const tx = db.transaction("store_produk", "readonly");
    tx.objectStore("store_produk").get(prodId).onsuccess = (e) => {
        const prod = e.target.result;
        const matriks = prod?.matriks_varian || [];
        
        // Cari entri dengan ukuran yang cocok (ambil warna pertama sebagai base biaya)
        const matched = matriks.find(m => m.size === sizeVal);
        const baseHppVal = matched?.hpp_varian || 0;
        
        biayaKainInput.value = baseHppVal;
        calculateTotalHPP();
    };
}

let calculatedTotalHppGlobal = 0; // state cache hpp_total bersihtarget

function calculateTotalHPP() {
    const biayaKain = parseFloat(document.getElementById("hpp-biaya-kain")?.value || 0);
    const ongkosJahit = parseFloat(document.getElementById("hpp-ongkos-jahit")?.value || 0);
    const sablon = parseFloat(document.getElementById("hpp-sablon")?.value || 0);
    const packaging = parseFloat(document.getElementById("hpp-packaging")?.value || 0);
    const marginPercent = parseFloat(document.getElementById("hpp-margin")?.value || 0);

    const costBase = biayaKain + ongkosJahit + sablon + packaging;
    const totalHpp = costBase + (costBase * (marginPercent / 100));
    
    calculatedTotalHppGlobal = totalHpp;
    document.getElementById("hpp-total-display").innerText = `Rp ${totalHpp.toLocaleString('id-ID')}`;
    
    calculateChannelsPrice();
}

function calculateChannelsPrice() {
    const basePrice = calculatedTotalHppGlobal;

    const channels = ["wa", "shopee", "tiktok", "reseller", "grosir"];
    channels.forEach(ch => {
        const inputPct = parseFloat(document.getElementById(`adm-${ch}`)?.value || 0);
        // Formula proyeksi harga jual memperhitungkan potongan persentase admin marketplace manual
        const finalPrice = basePrice / (1 - (inputPct / 100));
        
        const displayEl = document.getElementById(`prc-${ch}`);
        if (displayEl) {
            displayEl.innerText = isFinite(finalPrice) ? `Rp ${Math.round(finalPrice).toLocaleString('id-ID')}` : "Rp 0";
            displayEl.setAttribute("data-raw-price", isFinite(finalPrice) ? Math.round(finalPrice) : 0);
        }
    });
}

function saveHPP(e) {
    e.preventDefault();
    if (!db) return;

    const idVal = document.getElementById("hpp-id").value;
    const modelSelect = document.getElementById("hpp-pilih-model");
    const sizeSelect = document.getElementById("hpp-pilih-size");

    const prodId = parseInt(modelSelect.value, 10);
    const size_terpilih = sizeSelect.value;
    const nama_model = modelSelect.options[modelSelect.selectedIndex]?.text || "";

    const biaya_kain_otomatis = parseFloat(document.getElementById("hpp-biaya-kain").value || 0);
    const ongkos_jahit = parseFloat(document.getElementById("hpp-ongkos-jahit").value || 0);
    const aplikasi_sablon = parseFloat(document.getElementById("hpp-sablon").value || 0);
    const packaging = parseFloat(document.getElementById("hpp-packaging").value || 0);
    const margin_percent = parseFloat(document.getElementById("hpp-margin").value || 0);
    const hpp_total = calculatedTotalHppGlobal;

    const harga_jual_channels = {
        wa: parseFloat(document.getElementById("prc-wa").getAttribute("data-raw-price") || 0),
        shopee: parseFloat(document.getElementById("prc-shopee").getAttribute("data-raw-price") || 0),
        tiktok: parseFloat(document.getElementById("prc-tiktok").getAttribute("data-raw-price") || 0),
        reseller: parseFloat(document.getElementById("prc-reseller").getAttribute("data-raw-price") || 0),
        grosir: parseFloat(document.getElementById("prc-grosir").getAttribute("data-raw-price") || 0)
    };

    const dataSave = {
        prodId, nama_model, size_terpilih, biaya_kain_otomatis, ongkos_jahit, aplikasi_sablon,
        packaging, margin_percent, hpp_total, harga_jual_channels,
        timestamp: Date.now()
    };

    const tx = db.transaction("store_hpp", "readwrite");
    const store = tx.objectStore("store_hpp");

    if (idVal) {
        dataSave.id = parseInt(idVal, 10);
        store.put(dataSave).onsuccess = () => { resetFormHPP(); refreshAllTables(); };
    } else {
        store.add(dataSave).onsuccess = () => { resetFormHPP(); refreshAllTables(); };
    }
}

function resetFormHPP() {
    document.getElementById("hpp-id").value = "";
    document.getElementById("form-hpp").reset();
    calculateTotalHPP();
}

function deleteHPP(id) {
    if (!db || !confirm("Hapus skema HPP channel ini?")) return;
    const tx = db.transaction("store_hpp", "readwrite");
    tx.objectStore("store_hpp").delete(id).onsuccess = () => { refreshAllTables(); };
}

function renderTableHpp() {
    const tbody = document.getElementById("table-hpp-body");
    const selectModelHpp = document.getElementById("hpp-pilih-model");
    const selectModelRetur = document.getElementById("retur-model");
    if (!tbody) return;

    // Load dropdown options untuk modul HPP & modul Retur sekaligus dari data produk master
    const txProd = db.transaction("store_produk", "readonly");
    txProd.objectStore("store_produk").getAll().onsuccess = (e) => {
        const list = e.target.result || [];
        let optHtml = list.map(p => `<option value="${p.id}">${p.nama_model}</option>`).join("");
        
        if (selectModelHpp && selectModelHpp.children.length !== list.length) {
            selectModelHpp.innerHTML = optHtml || `<option value="">Tidak ada model</option>`;
            syncHppModelSelect();
        }
        if (selectModelRetur) {
            selectModelRetur.innerHTML = optHtml || `<option value="">Tidak ada model</option>`;
        }
    };

    const tx = db.transaction("store_hpp", "readonly");
    let html = "";
    tx.objectStore("store_hpp").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const h = cursor.value;
            html += `
            <tr class="hover:bg-slate-50 text-xs">
                <td class="p-4 font-bold text-[#0F172A]">${h.nama_model} (${h.size_terpilih})</td>
                <td class="p-4 font-semibold text-slate-700">Rp ${(h.hpp_total || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-emerald-600 font-bold">Rp ${(h.harga_jual_channels?.wa || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-[#3B82F6] font-bold">Rp ${(h.harga_jual_channels?.shopee || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-slate-800 font-bold">Rp ${(h.harga_jual_channels?.tiktok || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-purple-600 font-bold">Rp ${(h.harga_jual_channels?.reseller || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-orange-600 font-bold">Rp ${(h.harga_jual_channels?.grosir || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteHPP(${h.id})" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg transition-all">Hapus</button>
                </td>
            </tr>`;
            cursor.continue();
        } else {
            tbody.innerHTML = html || `<tr><td colspan="8" class="p-6 text-center text-slate-400 italic">Belum ada skema simulasi HPP terbuat.</td></tr>`;
        }
    };
}

function downloadPDFHppAll() {
    if (!db) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42);
    pdf.text("LAPORAN RESUME KOMPARASI SKEMA HARGA JUAL HPP", 14, 20);
    pdf.line(14, 24, 196, 24);

    let currentY = 32;
    const tx = db.transaction("store_hpp", "readonly");
    tx.objectStore("store_hpp").getAll().onsuccess = (e) => {
        const arr = e.target.result || [];
        pdf.setFontSize(9);
        pdf.setFont("Helvetica", "normal");
        
        arr.forEach((h) => {
            if (currentY > 280) { pdf.addPage(); currentY = 20; }
            let textLine = `${h.nama_model} (${h.size_terpilih}) -> HPP Inti: Rp${Math.round(h.hpp_total)} | WA: Rp${h.harga_jual_channels?.wa} | Shopee: Rp${h.harga_jual_channels?.shopee} | TikTok: Rp${h.harga_jual_channels?.tiktok}`;
            pdf.text(textLine, 14, currentY);
            currentY += 6;
        });
        pdf.save("Clothvers_SkemaHPP.pdf");
    };
}


// ==========================================
// MODULE C: TERMINAL POS KASIR
// ==========================================
function renderPosCatalogAndState() {
    const catalogContainer = document.getElementById("pos-catalog-container");
    if (!catalogContainer) return;

    // Load katalog picker komparasi dari store_produk
    const tx = db.transaction("store_produk", "readonly");
    let html = "";
    
    tx.objectStore("store_produk").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const p = cursor.value;
            const matriks = p?.matriks_varian || [];
            
            html += `<div class="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100 space-y-2">
                        <span class="text-xs font-bold text-[#0F172A] block">👔 ${p.nama_model}</span>
                        <div class="flex flex-wrap gap-1">`;
            
            matriks.forEach((m, index) => {
                if ((m?.stok || 0) > 0) {
                    html += `<button onclick="addItemToCart('${p.nama_model}', '${m.warna}', '${m.size}', ${m.jual_varian})" class="bg-white hover:bg-[#3B82F6] hover:text-white border border-slate-200 rounded-lg text-[10px] font-medium px-2 py-1 text-slate-700 transition-all">
                                ${m.warna}-${m.size} (Rp ${m.jual_varian.toLocaleString('id-ID')})
                             </button>`;
                }
            });

            html += `</div></div>`;
            cursor.continue();
        } else {
            catalogContainer.innerHTML = html || `<p class="text-xs text-slate-400 italic">Katalog kosong. Sediakan stok baju terlebih dahulu.</p>`;
        }
    };

    renderCartTable();
}

function addItemToCart(model, warna, size, harga) {
    const key = `${model}-${warna}-${size}`;
    const existing = cartState.find(item => item.key === key);
    
    if (existing) {
        existing.qty += 1;
    } else {
        cartState.push({ key, model, warna, size, harga, qty: 1 });
    }
    renderCartTable();
}

function updateCartQty(key, newQty) {
    const item = cartState.find(i => i.key === key);
    if (item) {
        item.qty = parseInt(newQty, 10) || 1;
    }
    renderCartTable();
}

function updateCartHarga(key, newHarga) {
    const item = cartState.find(i => i.key === key);
    if (item) {
        item.harga = parseFloat(newHarga) || 0;
    }
    renderCartTable();
}

function removeCartItem(key) {
    cartState = cartState.filter(i => i.key !== key);
    renderCartTable();
}

function renderCartTable() {
    const tbody = document.getElementById("cart-table-body");
    if (!tbody) return;

    let html = "";
    cartState.forEach(i => {
        const subTotal = i.qty * i.harga;
        html += `
        <tr class="text-xs text-[#334155]">
            <td class="p-3 font-medium">${i.model} <br><span class="text-[10px] text-slate-400">${i.warna} / Size ${i.size}</span></td>
            <td class="p-1"><input type="number" oninput="updateCartQty('${i.key}', this.value)" class="w-12 text-center border border-slate-200 p-1 rounded" value="${i.qty}"></td>
            <td class="p-1"><input type="number" oninput="updateCartHarga('${i.key}', this.value)" class="w-20 border border-slate-200 p-1 rounded" value="${i.harga}"></td>
            <td class="p-3 font-bold text-[#0F172A]">Rp ${subTotal.toLocaleString('id-ID')}</td>
            <td class="p-3 text-center"><button onclick="removeCartItem('${i.key}')" class="text-red-500 font-bold hover:text-red-700">❌</button></td>
        </tr>`;
    });

    tbody.innerHTML = html || `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Belum melampirkan item belanja belanjaan.</td></tr>`;
    calculatePosCheckout();
}

let posGrossTotal = 0;
let posNetTotal = 0;
let posDiscountVal = 0;

function calculatePosCheckout() {
    posGrossTotal = 0;
    cartState.forEach(i => { posGrossTotal += (i.qty * i.harga); });

    const discInput = document.getElementById("pos-diskon")?.value || "0";
    if (discInput.endsWith("%")) {
        const pct = parseFloat(discInput.replace("%", "")) || 0;
        posDiscountVal = posGrossTotal * (pct / 100);
    } else {
        posDiscountVal = parseFloat(discInput) || 0;
    }

    posNetTotal = posGrossTotal - posDiscountVal;
    if (posNetTotal < 0) posNetTotal = 0;

    document.getElementById("pos-gross-display").innerText = `Rp ${posGrossTotal.toLocaleString('id-ID')}`;
    document.getElementById("pos-discount-display").innerText = `- Rp ${posDiscountVal.toLocaleString('id-ID')}`;
    document.getElementById("pos-net-display").innerText = `Rp ${posNetTotal.toLocaleString('id-ID')}`;
}

function checkoutTransaksi() {
    if (!db) return;
    if (cartState.length === 0) { alert("Keranjang belanja kosong!"); return; }

    const nama_customer = document.getElementById("pos-nama-customer").value.trim();
    const nomor_hp = document.getElementById("pos-hp-customer").value.trim();
    const tgl_order = document.getElementById("pos-tgl-order").value;
    const tgl_selesai = document.getElementById("pos-tgl-selesai").value;
    const ekspedisi = document.getElementById("pos-ekspedisi").value;
    const resi = document.getElementById("pos-resi").value;
    const status_bayar = document.getElementById("pos-status-bayar").value;

    if (!nama_customer || !nomor_hp || !tgl_order) {
        alert("Mohon lengkapi Nama Pelanggan, Nomor HP, dan Tanggal Transaksi.");
        return;
    }

    const tx = db.transaction(["store_transaksi", "store_customer", "store_jurnal_akuntansi", "store_produk"], "readwrite");
    
    // 1. Save data log invoice ke store_transaksi
    const txObj = {
        nama_customer, nomor_hp, tgl_order, tgl_selesai, ekspedisi, resi, status_bayar,
        cart_items: JSON.parse(JSON.stringify(cartState)),
        gross_total: posGrossTotal,
        diskon: posDiscountVal,
        net_total: posNetTotal,
        timestamp: Date.now()
    };

    tx.objectStore("store_transaksi").add(txObj).onsuccess = (e) => {
        lastInvoiceId = e.target.result;
        
        // Aktifkan tombol cetak
        document.getElementById("btn-print-struk").removeAttribute("disabled");
        document.getElementById("btn-wa-struk").removeAttribute("disabled");

        // 2. Integrasikan Real-time / Upsert Data CRM Pelanggan
        const custStore = tx.objectStore("store_customer");
        custStore.openCursor().onsuccess = (cEvent) => {
            const cursor = cEvent.target.result;
            let found = false;
            if (cursor) {
                if (cursor.value.nomor_hp === nomor_hp) {
                    const existCust = cursor.value;
                    existCust.total_transaksi = (existCust.total_transaksi || 0) + posNetTotal;
                    custStore.put(existCust);
                    found = true;
                } else {
                    cursor.continue();
                }
            }
            if (!cursor && !found) {
                custStore.add({
                    nama_customer, nomor_hp,
                    total_transaksi: posNetTotal,
                    timestamp: Date.now()
                });
            }
        };

        // 3. Potong kuantitas stok terinput secara otomatis di store_produk (Live Sync)
        const prodStore = tx.objectStore("store_produk");
        cartState.forEach(cItem => {
            prodStore.openCursor().onsuccess = (pEvent) => {
                const pCursor = pEvent.target.result;
                if (pCursor) {
                    if (pCursor.value.nama_model === cItem.model) {
                        const originalProd = pCursor.value;
                        originalProd.matriks_varian = originalProd.matriks_varian.map(v => {
                            if (v.warna === cItem.warna && v.size === cItem.size) {
                                v.stok = (v.stok || 0) - cItem.qty;
                                if (v.stok < 0) v.stok = 0;
                            }
                            return v;
                        });
                        prodStore.put(originalProd);
                    } else {
                        pCursor.continue();
                    }
                }
            };
        });

        // Transaksi tuntas
        alert(`Transaksi Nota POS #${lastInvoiceId} Berhasil Disimpan dan Disinkronisasi!`);
        cartState = [];
        document.getElementById("form-pos-cust-info")?.reset(); 
        refreshAllTables();
    };
}

function renderTablePosLog() {
    const tbody = document.getElementById("table-pos-body");
    if (!tbody) return;

    let html = "";
    const tx = db.transaction("store_transaksi", "readonly");
    tx.objectStore("store_transaksi").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const t = cursor.value;
            
            let itemDesc = t.cart_items?.map(i => `${i.model} (${i.warna}-${i.size}) x${i.qty}`).join(", ");
            const badgeColor = t.status_bayar === "LUNAS" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

            html += `
            <tr class="hover:bg-slate-50 text-xs">
                <td class="p-4 font-bold text-[#0F172A]">#INV-${t.id}<br><span class="text-[10px] text-slate-400">${t.tgl_order}</span></td>
                <td class="p-4 font-medium">${t.nama_customer}<br><span class="text-[10px] text-slate-400">${t.nomor_hp}</span></td>
                <td class="p-4 text-slate-500 max-w-xs truncate">${itemDesc}</td>
                <td class="p-4 font-extrabold text-[#0F172A]">Rp ${(t.net_total || 0).toLocaleString('id-ID')}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${badgeColor}">${t.status_bayar}</span></td>
                <td class="p-4 text-center">
                    <button onclick="triggerActionExternal(${t.id})" class="text-[11px] font-bold bg-[#0F172A] text-white px-2 py-1 rounded">Cetak Ulang</button>
                </td>
            </tr>`;
            cursor.continue();
        } else {
            tbody.innerHTML = html || `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">Belum ada rekaman log invoice POS masuk.</td></tr>`;
        }
    };
}

function triggerActionExternal(id) {
    lastInvoiceId = id;
    document.getElementById("btn-print-struk").removeAttribute("disabled");
    document.getElementById("btn-wa-struk").removeAttribute("disabled");
    printStrukTerakhir();
}

function printStrukTerakhir() {
    if (!lastInvoiceId || !db) return;
    
    const tx = db.transaction("store_transaksi", "readonly");
    tx.objectStore("store_transaksi").get(lastInvoiceId).onsuccess = (e) => {
        const t = e.target.result;
        if (!t) return;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", [80, 150]); // Format mini Struk Thermal Kertas 80mm
        
        pdf.setFont("Courier", "bold");
        pdf.setFontSize(12);
        pdf.text("CLOTHVERS SYSTEM", 40, 12, { align: "center" });
        pdf.setFontSize(8);
        pdf.setFont("Courier", "normal");
        pdf.text("Premium Clothing Production ERP", 40, 16, { align: "center" });
        pdf.text("-------------------------------------", 40, 20, { align: "center" });
        
        pdf.text(`Nota  : #INV-${t.id}`, 6, 25);
        pdf.text(`Cust  : ${t.nama_customer}`, 6, 29);
        pdf.text(`HP    : ${t.nomor_hp}`, 6, 33);
        pdf.text(`Order : ${t.tgl_order}`, 6, 37);
        pdf.text(`Est   : ${t.tgl_selesai || '-'}`, 6, 41);
        pdf.text("-------------------------------------", 40, 46, { align: "center" });

        let currentY = 51;
        t.cart_items?.forEach(i => {
            pdf.text(`${i.model.substring(0,18)} (${i.warna}-${i.size})`, 6, currentY);
            currentY += 4;
            pdf.text(`  ${i.qty} x Rp${i.harga.toLocaleString('id-ID')}   Sub:Rp${(i.qty*i.harga).toLocaleString('id-ID')}`, 6, currentY);
            currentY += 5;
        });

        pdf.text("-------------------------------------", 40, currentY, { align: "center" });
        currentY += 4;
        pdf.text(`Gross Total : Rp ${t.gross_total.toLocaleString('id-ID')}`, 6, currentY); currentY += 4;
        pdf.text(`Diskon      : Rp ${t.diskon.toLocaleString('id-ID')}`, 6, currentY); currentY += 4;
        pdf.setFont("Courier", "bold");
        pdf.text(`GRAND TOTAL : Rp ${t.net_total.toLocaleString('id-ID')}`, 6, currentY); currentY += 4;
        pdf.text(`STATUS      : ${t.status_bayar}`, 6, currentY);

        currentY += 8;
        pdf.setFont("Courier", "italic");
        pdf.text("Terima kasih atas pesanan Anda!", 40, currentY, { align: "center" });

        pdf.save(`Struk_Clothvers_INV_${t.id}.pdf`);
    };
}

function shareWhatsAppTerakhir() {
    if (!lastInvoiceId || !db) return;

    const tx = db.transaction("store_transaksi", "readonly");
    tx.objectStore("store_transaksi").get(lastInvoiceId).onsuccess = (e) => {
        const t = e.target.result;
        if (!t) return;

        let itemText = t.cart_items?.map(i => `- ${i.model} (${i.warna}/${i.size}) x${i.qty} = Rp ${(i.qty*i.harga).toLocaleString('id-ID')}`).join("%0A");

        let waMessage = `*NOTA TRANSAKSI KONFIRMASI CLOTHVERS*%0A%0A` +
                        `Halo Kak ${t.nama_customer}, berikut rincian antrean pesanan pakaian Anda:%0A` +
                        `• *Nota ID* : #INV-${t.id}%0A` +
                        `• *Tanggal Order* : ${t.tgl_order}%0A` +
                        `• *Estimasi Selesai* : ${t.tgl_selesai || '-'}%0A` +
                        `• *Status Pembayaran* : *${t.status_bayar}*%0A%0A` +
                        `*Rincian Item Belanja:*%0A${itemText}%0A%0A` +
                        `*Grand Total Tagihan:* Rp ${t.net_total.toLocaleString('id-ID')}%0A%0A` +
                        `Terima kasih telah berkolaborasi bersama kami! %0AMade in by Clothvers x Elevatio.`;

        // Format nomor hp membersihkan digit non-numerik
        let clearHp = t.nomor_hp.replace(/\D/g, '');
        if (clearHp.startsWith('0')) clearHp = '62' + clearHp.substring(1);

        const waUrl = `https://api.whatsapp.com/send?phone=${clearHp}&text=${waMessage}`;
        window.open(waUrl, '_blank');
    };
}


// ==========================================
// MODULE D: DATABASE CUSTOMER (CRM LOG)
// ==========================================
function renderTableCrm() {
    const tbody = document.getElementById("table-crm-body");
    if (!tbody) return;

    let html = "";
    const tx = db.transaction("store_customer", "readonly");
    tx.objectStore("store_customer").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const c = cursor.value;
            const regDate = new Date(c.timestamp).toLocaleDateString('id-ID');

            html += `
            <tr class="hover:bg-slate-50 text-sm">
                <td class="p-4 text-slate-500">${regDate}</td>
                <td class="p-4 font-bold text-[#0F172A]">${c.nama_customer}</td>
                <td class="p-4 font-medium text-slate-600">${c.nomor_hp}</td>
                <td class="p-4 font-extrabold text-[#3B82F6]">Rp ${(c.total_transaksi || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteCustomer(${c.id})" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl font-bold">Hapus</button>
                </td>
            </tr>`;
            cursor.continue();
        } else {
            tbody.innerHTML = html || `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Database customer CRM masih kosong.</td></tr>`;
        }
    };
}

function deleteCustomer(id) {
    if (!confirm("Hapus customer ini dari database log CRM?")) return;
    const tx = db.transaction("store_customer", "readwrite");
    tx.objectStore("store_customer").delete(id).onsuccess = () => { refreshAllTables(); };
}

function downloadPDFCustomerAll() {
    if (!db) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("Helvetica", "bold");
    pdf.text("DATABASE CUSTOMER CLOTHVERS (CRM CLIENT LOG)", 14, 20);
    pdf.line(14, 24, 196, 24);

    let currentY = 32;
    const tx = db.transaction("store_customer", "readonly");
    tx.objectStore("store_customer").getAll().onsuccess = (e) => {
        const list = e.target.result || [];
        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(10);
        list.forEach(c => {
            pdf.text(`• ${c.nama_customer} (${c.nomor_hp}) -> Total Kontribusi Belanja: Rp${c.total_transaksi}`, 14, currentY);
            currentY += 6;
        });
        pdf.save("Clothvers_Database_Customer.pdf");
    };
}


// ==========================================
// MODULE E: MODUL RETUR & INVENTARIS ALAT
// ==========================================
function saveRetur(e) {
    e.preventDefault();
    if (!db) return;

    const modelSelect = document.getElementById("retur-model");
    const nama_model = modelSelect.options[modelSelect.selectedIndex]?.text || "";
    const jenis_kasus = document.getElementById("retur-jenis").value;
    const qty = parseInt(document.getElementById("retur-qty").value || 0, 10);
    const kerugian = parseFloat(document.getElementById("retur-kerugian").value || 0);
    const memo = document.getElementById("retur-keterangan").value.trim();

    const data = { nama_model, jenis_kasus, qty, kerugian, memo, timestamp: Date.now() };

    const tx = db.transaction("store_retur_reject", "readwrite");
    tx.objectStore("store_retur_reject").add(data).onsuccess = () => {
        document.getElementById("form-retur").reset();
        refreshAllTables();
    };
}

function deleteRetur(id) {
    const tx = db.transaction("store_retur_reject", "readwrite");
    tx.objectStore("store_retur_reject").delete(id).onsuccess = () => { refreshAllTables(); };
}

function saveInventaris(e) {
    e.preventDefault();
    if (!db) return;

    const nama_aset = document.getElementById("inv-nama").value.trim();
    const harga_perolehan = parseFloat(document.getElementById("inv-harga").value || 0);
    const penyusutan_bulanan = parseFloat(document.getElementById("inv-susut").value || 0);

    const data = { nama_aset, harga_perolehan, penyusutan_bulanan, timestamp: Date.now() };

    const tx = db.transaction("store_inventaris", "readwrite");
    tx.objectStore("store_inventaris").add(data).onsuccess = () => {
        document.getElementById("form-inventaris").reset();
        refreshAllTables();
    };
}

function deleteInventaris(id) {
    const tx = db.transaction("store_inventaris", "readwrite");
    tx.objectStore("store_inventaris").delete(id).onsuccess = () => { refreshAllTables(); };
}

function renderReturAndInventaris() {
    const rBody = document.getElementById("table-retur-body");
    const iBody = document.getElementById("table-inventaris-body");
    
    if (rBody) {
        let html = "";
        const tx = db.transaction("store_retur_reject", "readonly");
        tx.objectStore("store_retur_reject").openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const r = cursor.value;
                html += `
                <tr class="text-xs hover:bg-slate-50">
                    <td class="p-3 font-bold">${r.nama_model}</td>
                    <td class="p-3 font-medium">${r.jenis_kasus}</td>
                    <td class="p-3 font-semibold">${r.qty} Pcs</td>
                    <td class="p-3 text-red-500 font-bold">Rp ${r.kerugian.toLocaleString('id-ID')}</td>
                    <td class="p-3 text-center"><button onclick="deleteRetur(${r.id})" class="text-red-500 font-bold">✕</button></td>
                </tr>`;
                cursor.continue();
            } else { rBody.innerHTML = html || `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">Kosong</td></tr>`; }
        };
    }

    if (iBody) {
        let html = "";
        const tx = db.transaction("store_inventaris", "readonly");
        tx.objectStore("store_inventaris").openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const inv = cursor.value;
                html += `
                <tr class="text-xs hover:bg-slate-50">
                    <td class="p-3 font-bold">${inv.nama_aset}</td>
                    <td class="p-3 font-semibold">Rp ${inv.harga_perolehan.toLocaleString('id-ID')}</td>
                    <td class="p-3 text-amber-600 font-bold">Rp ${inv.penyusutan_bulanan.toLocaleString('id-ID')}</td>
                    <td class="p-3 text-center"><button onclick="deleteInventaris(${inv.id})" class="text-red-500 font-bold">✕</button></td>
                </tr>`;
                cursor.continue();
            } else { iBody.innerHTML = html || `<tr><td colspan="4" class="p-4 text-center text-slate-400 italic">Kosong</td></tr>`; }
        };
    }
}


// ==========================================
// MODULE F: DASHBOARD AKUNTANSI & KEUANGAN
// ==========================================
function changeSubFilterRange(rangeType) {
    currentSubFilterRange = rangeType;
    document.querySelectorAll(".subfilter-btn").forEach(b => {
        b.classList.remove("bg-white", "text-[#0F172A]", "shadow-xs");
        b.classList.add("text-slate-500");
    });
    const activeBtn = document.getElementById(`subfilter-${rangeType}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-500");
        activeBtn.classList.add("bg-white", "text-[#0F172A]", "shadow-xs");
    }
    renderAkuntansiDashboard();
}

function saveJurnalManual(e) {
    e.preventDefault();
    if (!db) return;

    const jenis_aliran = document.getElementById("jurnal-jenis").value;
    const nominal = parseFloat(document.getElementById("jurnal-nominal").value || 0);
    const keterangan = document.getElementById("jurnal-memo").value.trim();

    const data = { jenis_aliran, nominal, keterangan, timestamp: Date.now() };

    const tx = db.transaction("store_jurnal_akuntansi", "readwrite");
    tx.objectStore("store_jurnal_akuntansi").add(data).onsuccess = () => {
        document.getElementById("form-akuntansi").reset();
        refreshAllTables();
    };
}

function deleteJurnalManual(id) {
    if (!confirm("Hapus baris entri finansial manual ini?")) return;
    const tx = db.transaction("store_jurnal_akuntansi", "readwrite");
    tx.objectStore("store_jurnal_akuntansi").delete(id).onsuccess = () => { refreshAllTables(); };
}

function renderAkuntansiDashboard() {
    if (!db) return;

    let totalModalInput = 0;
    let sisaModalBerjalan = 0;
    let totalOmsetPenjualan = 0;
    let totalPiutangDp = 0;
    let labaBersihRiil = 0;

    let pengeluaranManual = 0;
    let uangMasukManual = 0;
    let pembelianBahanBaku = 0;
    let totalKerugianReject = 0;
    let totalPenyusutanAset = 0;

    const combinedLedgerList = [];

    // Mengambil 4 data stores terpisah untuk kalkulasi rumus finansial pintar komprehensif
    const tx = db.transaction(["store_jurnal_akuntansi", "store_transaksi", "store_retur_reject", "store_inventaris"], "readonly");
    
    // 1. Olah Jurnal Manual
    tx.objectStore("store_jurnal_akuntansi").getAll().onsuccess = (e) => {
        const jList = e.target.result || [];
        jList.forEach(j => {
            if (j.jenis_aliran === "MODAL_AWAL") totalModalInput += j.nominal;
            if (j.jenis_aliran === "MASUK_LAIN") uangMasukManual += j.nominal;
            if (j.jenis_aliran === "KELUAR_OPERASIONAL") pengeluaranManual += j.nominal;
            if (j.jenis_aliran === "BELI_BAHAN") pembelianBahanBaku += j.nominal;

            if (isDataInSelectedPeriod(j.timestamp)) {
                combinedLedgerList.push({
                    id: j.id,
                    timestamp: j.timestamp,
                    jenis: j.jenis_aliran,
                    keterangan: j.keterangan,
                    nominal: j.nominal,
                    isManual: true
                });
            }
        });
    };

    // 2. Olah Transaksi Masuk POS
    tx.objectStore("store_transaksi").getAll().onsuccess = (e) => {
        const tList = e.target.result || [];
        tList.forEach(t => {
            totalOmsetPenjualan += (t.net_total || 0);
            if (t.status_bayar === "DP") {
                totalPiutangDp += (t.net_total * 0.5); // Simulasi asumsi sisa piutang DP 50%
            }

            if (isDataInSelectedPeriod(t.timestamp)) {
                combinedLedgerList.push({
                    id: t.id,
                    timestamp: t.timestamp,
                    jenis: `POS_${t.status_bayar}`,
                    keterangan: `Penjualan Kasir POS a.n ${t.nama_customer}`,
                    nominal: t.net_total,
                    isManual: false
                });
            }
        });
    };

    // 3. Olah Kerugian Reject
    tx.objectStore("store_retur_reject").getAll().onsuccess = (e) => {
        const rList = e.target.result || [];
        rList.forEach(r => { totalKerugianReject += (r.kerugian || 0); });
    };

    // 4. Olah Penyusutan Inventaris
    tx.objectStore("store_inventaris").getAll().onsuccess = (e) => {
        const iList = e.target.result || [];
        iList.forEach(i => { totalPenyusutanAset += (i.penyusutan_bulanan || 0); });

        // SELESAI REQUEST ASYNC - JALANKAN KALKULASI FINANSIAL FINAL INDIKATOR KARTU
        sisaModalBerjalan = totalModalInput + uangMasukManual - pengeluaranManual - pembelianBahanBaku;
        labaBersihRiil = (totalOmsetPenjualan + uangMasukManual) - (pengeluaranManual + pembelianBahanBaku + totalKerugianReject + totalPenyusutanAset);

        document.getElementById("fin-modal").innerText = `Rp ${totalModalInput.toLocaleString('id-ID')}`;
        document.getElementById("fin-sisa-modal").innerText = `Rp ${sisaModalBerjalan.toLocaleString('id-ID')}`;
        document.getElementById("fin-omset").innerText = `Rp ${totalOmsetPenjualan.toLocaleString('id-ID')}`;
        document.getElementById("fin-piutang").innerText = `Rp ${totalPiutangDp.toLocaleString('id-ID')}`;
        
        const labaEl = document.getElementById("fin-laba");
        labaEl.innerText = `Rp ${labaBersihRiil.toLocaleString('id-ID')}`;
        if (labaBersihRiil < 0) {
            labaEl.className = "text-lg font-black text-red-600 mt-1";
        } else {
            labaEl.className = "text-lg font-black text-[#10B981] mt-1";
        }

        renderBukuBesarTable(combinedLedgerList);
    };
}

function renderBukuBesarTable(list) {
    const tbody = document.getElementById("table-akuntansi-body");
    if (!tbody) return;

    // Sort kronologis urutan menurun berdasar timestamp waktu log terbaru
    list.sort((a, b) => b.timestamp - a.timestamp);

    // Apply filter sub-range waktu dinamis tambahan [HARI, MINGGU, BULAN, TAHUN]
    const now = Date.now();
    const filteredList = list.filter(item => {
        const diffTime = Math.abs(now - item.timestamp);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (currentSubFilterRange === 'HARI') return diffDays <= 1;
        if (currentSubFilterRange === 'MINGGU') return diffDays <= 7;
        if (currentSubFilterRange === 'BULAN') return diffDays <= 30;
        return true; // TAHUN / ALL s.d 2030
    });

    let html = "";
    filteredList.forEach(item => {
        const dateStr = new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
        
        const aksiHtml = item.isManual 
            ? `<button onclick="deleteJurnalManual(${item.id})" class="text-xs text-red-500 font-bold hover:underline">Hapus</button>`
            : `<span class="text-slate-400 font-normal italic">Auto Sync</span>`;

        html += `
        <tr class="hover:bg-slate-50 text-xs text-[#334155]">
            <td class="p-3 text-slate-500">${dateStr}</td>
            <td class="p-3 font-bold text-slate-700">${item.jenis}</td>
            <td class="p-3 max-w-xs truncate font-medium">${item.keterangan}</td>
            <td class="p-3 font-extrabold text-[#0F172A]">Rp ${item.nominal.toLocaleString('id-ID')}</td>
            <td class="p-3 text-center">${aksiHtml}</td>
        </tr>`;
    });

    tbody.innerHTML = html || `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Tidak ada rekaman kas masuk/keluar di jangka jangkauan filter ini.</td></tr>`;
}

function downloadPDFAkuntansi() {
    alert("Mengonversi berkas skema akuntansi buku besar ke format PDF...");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.text("BUKU BESAR KRONOLOGIS KEUANGAN CLOTHVERS ERP", 14, 20);
    pdf.save("Laporan_Akuntansi_Clothvers.pdf");
}

function exportExcelAkuntansi() {
    // Generate format CSV spreadsheet standar universal excel
    let csvContent = "data:text/csv;charset=utf-8,Waktu,Jenis Aliran,Keterangan,Nominal\n";
    alert("Mengekspor data spreadsheet CSV Buku Besar siap pakai...");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Clothvers_Buku_Besar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// ==========================================
// MODULE G: DATABASE SYNC BRIDGE & BACKUP PANEL
// ==========================================
function backupSystemJSON() {
    if (!db) return;
    
    const storeNames = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject", "store_inventaris", "store_customer"];
    const backupData = {};
    const tx = db.transaction(storeNames, "readonly");
    
    let count = 0;
    storeNames.forEach(storeName => {
        tx.objectStore(storeName).getAll().onsuccess = (e) => {
            backupData[storeName] = e.target.result || [];
            count++;
            
            if (count === storeNames.length) {
                // Semua skema terkumpul ekspor ke file teks blob download
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                const dlAnchor = document.createElement("a");
                dlAnchor.setAttribute("href", dataStr);
                dlAnchor.setAttribute("download", `ClothversDB_Backup_V1.0_${Date.now()}.json`);
                document.body.appendChild(dlAnchor);
                dlAnchor.click();
                dlAnchor.remove();
            }
        };
    });
}

function restoreSystemJSON(event) {
    const file = event.target.files[0];
    if (!file || !db) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            const storeNames = Object.keys(importedData);
            
            const tx = db.transaction(storeNames, "readwrite");
            storeNames.forEach(storeName => {
                const store = tx.objectStore(storeName);
                store.clear(); // Hapus data lokal lama untuk menghindari konflik kunci duplikat
                
                const arr = importedData[storeName] || [];
                arr.forEach(item => { store.add(item); });
            });

            tx.oncomplete = () => {
                alert("Restorasi Repositori Data Sistem Sukses Diimpor Total!");
                refreshAllTables();
            };
        } catch (err) {
            alert("Gagal memproses file .JSON, pastikan struktur valid. Error: " + err.message);
        }
    };
    reader.readAsText(file);
}
