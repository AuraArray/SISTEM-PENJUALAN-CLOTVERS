/**
 * CLOTHVERS SYSTEM v1.0 - CORE ENGINE
 * Serverless ERP Single-Page Application (SPA)
 * Built with Pure Vanilla JavaScript & IndexedDB Secure Layer
 */

// Global App Configuration & State Management
const DB_NAME = "ClothversDB";
const DB_VERSION = 1;
let db = null;

// Temporary State Management (Mencegah Kehilangan Data Input Saat Rendering)
let currentCart = [];
let lastSavedTransactionId = null;
const availableSizes = ["S", "M", "L", "XL", "2XL"];
const appModules = ["modul-stok", "modul-hpp", "modul-pos", "modul-customer", "modul-logistik", "modul-akuntansi"];

// Definisi Struktur Menu Navigasi Global
const navigationItems = [
    { id: "modul-stok", label: "Master Stok Pakaian", icon: "fa-boxes-stacked" },
    { id: "modul-hpp", label: "Manajemen HPP", icon: "fa-tags" },
    { id: "modul-pos", label: "Terminal Kasir POS", icon: "fa-cash-register" },
    { id: "modul-customer", label: "Database Customer", icon: "fa-users" },
    { id: "modul-logistik", label: "Retur & Aset Toko", icon: "fa-truck-ramp-box" },
    { id: "modul-akuntansi", label: "Akuntansi & Keuangan", icon: "fa-receipt" }
];

// Inisialisasi Aplikasi Saat Window Dimuat Lengkap
window.addEventListener("DOMContentLoaded", async () => {
    initTimeFilters();
    initNavigation();
    await initIndexedDB();
    setupEventListeners();
    
    // Set Tanggal Hari Ini Default di Form POS
    const todayStr = new Date().toISOString().split('T')[0];
    const posTglOrder = document.getElementById("pos-tanggal-order");
    const posTglEst = document.getElementById("pos-tanggal-estimasi");
    if (posTglOrder) posTglOrder.value = todayStr;
    if (posTglEst) posTglEst.value = todayStr;

    // Sinkronisasi data awal view
    refreshAllDataViews();
});

/**
 * 1. SECURE INDEXEDDB ARCHITECTURE (ANTI-TYPEERROR INITIALIZATION)
 */
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Pembuatan 7 Objek Penyimpanan Utama (Object Stores)
            if (!database.objectStoreNames.contains("store_produk")) {
                database.createObjectStore("store_produk", { keyPath: "id", autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("store_hpp")) {
                database.createObjectStore("store_hpp", { keyPath: "id", autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("store_transaksi")) {
                database.createObjectStore("store_transaksi", { keyPath: "id", autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("store_jurnal_akuntansi")) {
                database.createObjectStore("store_jurnal_akuntansi", { keyPath: "id", autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("store_retur_reject")) {
                database.createObjectStore("store_retur_reject", { keyPath: "id", autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("store_inventaris")) {
                database.createObjectStore("store_inventaris", { keyPath: "id", autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("store_customer")) {
                database.createObjectStore("store_customer", { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("Gagal menginisialisasi ClothversDB Secure Database:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Pembungkus Transaksi CRUD Generik demi Keamanan Jangka Panjang s.d 2030+
function getStoreData(storeName) {
    return new Promise((resolve) => {
        if (!db) return resolve([]);
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
    });
}

function saveData(storeName, dataObject) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database belum siap");
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(dataObject);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database belum siap");
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.delete(Number(id));
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

/**
 * 2. STANDARISASI OMNI-DEVICE LAYOUT & KOMPONEN NAVIGASI
 */
function initTimeFilters() {
    const filterSelect = document.getElementById("global-periode-filter");
    if (!filterSelect) return;
    filterSelect.innerHTML = "";
    
    // Mengisi Filter Dropdown Panjang dari Tahun 2026 s.d 2030 secara Berurutan
    for (let year = 2026; year <= 2030; year++) {
        for (let month = 1; month <= 12; month++) {
            const opt = document.createElement("option");
            const padMonth = String(month).padStart(2, '0');
            opt.value = `${year}-${padMonth}`;
            opt.textContent = `${getBulanNama(month)} ${year}`;
            
            // Default select ke periode saat ini di tahun 2026 sesuai time konteks server
            if (year === 2026 && month === 6) opt.selected = true;
            filterSelect.appendChild(opt);
        }
    }
}

function initNavigation() {
    const desktopNav = document.getElementById("desktop-nav");
    const tabletNav = document.getElementById("tablet-drawer-nav");
    
    let htmlContent = "";
    navigationItems.forEach(item => {
        htmlContent += `
            <button onclick="switchModule('${item.id}')" data-mod="${item.id}" class="nav-link-btn w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all text-gray-600 hover:bg-white hover:text-[#0F172A]">
                <i class="fa-solid ${item.icon} text-base w-5 text-gray-400"></i>
                <span>${item.label}</span>
            </button>
        `;
    });

    if (desktopNav) desktopNav.innerHTML = htmlContent;
    if (tabletNav) tabletNav.innerHTML = htmlContent;
    
    // Set Default Active View Modul Pertama
    switchModule("modul-stok");
}

function switchModule(moduleId) {
    appModules.forEach(mod => {
        const el = document.getElementById(mod);
        if (el) {
            if (mod === moduleId) el.classList.remove("hidden");
            else el.classList.add("hidden");
        }
    });

    // Berikan Tanda Visual Berwarna Kontras pada Navigasi Aktif
    document.querySelectorAll(".nav-link-btn, .nav-mobile-btn").forEach(btn => {
        if (btn.getAttribute("data-mod") === moduleId) {
            btn.classList.add("bg-[#0F172A]", "text-white");
            btn.classList.remove("text-gray-600", "bg-transparent");
        } else {
            btn.classList.remove("bg-[#0F172A]", "text-white");
            btn.classList.add("text-gray-600");
        }
    });

    // Menutup Drawer Otomatis di Screen Tablet setelah Memilih Menu
    const drawer = document.getElementById("tablet-drawer");
    if (drawer) drawer.classList.add("hidden");
}

function setupEventListeners() {
    // Hamburger Drawer Control
    document.getElementById("drawer-toggle")?.addEventListener("click", () => {
        document.getElementById("tablet-drawer")?.classList.remove("hidden");
    });
    document.getElementById("drawer-close")?.addEventListener("click", () => {
        document.getElementById("tablet-drawer")?.classList.add("hidden");
    });
    document.getElementById("drawer-overlay")?.addEventListener("click", () => {
        document.getElementById("tablet-drawer")?.classList.add("hidden");
    });

    // Global Periode Filter
    document.getElementById("global-periode-filter")?.addEventListener("change", () => {
        refreshAllDataViews();
    });

    // Backup & Restore System Bridge
    document.getElementById("btn-backup-json")?.addEventListener("click", backupDatabaseToJSON);
    document.getElementById("btn-trigger-restore")?.addEventListener("click", () => {
        document.getElementById("input-restore-json")?.click();
    });
    document.getElementById("input-restore-json")?.addEventListener("change", restoreDatabaseFromJSON);

    // Module A: Form Handlers & Dinamis Warna
    document.getElementById("btn-tambah-warna")?.addEventListener("click", injectWarnaMatriksRow);
    document.getElementById("form-registrasi-stok")?.addEventListener("submit", prosesSimpanStok);
    document.getElementById("btn-pdf-stok")?.addEventListener("click", exportPDFStok);

    // Module B: HPP Live Form Interaction
    document.getElementById("hpp-select-model")?.addEventListener("change", updateHppSelectSizeDropdown);
    document.getElementById("hpp-select-size")?.addEventListener("change", syncHppBiayaKainOtomatis);
    document.getElementById("form-manajemen-hpp")?.addEventListener("submit", prosesSimpanHpp);
    document.getElementById("btn-pdf-hpp")?.addEventListener("click", exportPDFHpp);

    // Module C: POS Interactive Action
    document.getElementById("pos-select-produk")?.addEventListener("change", updatePosVarianDropdown);
    document.getElementById("btn-tambah-keranjang")?.addEventListener("click", tambahItemKeKeranjang);
    document.getElementById("pos-diskon-nilai")?.addEventListener("input", hitungUlangGrandTotalPOS);
    document.getElementById("pos-diskon-tipe")?.addEventListener("change", hitungUlangGrandTotalPOS);
    document.getElementById("btn-pay-lunas")?.addEventListener("click", () => toggleDPFieldPOS(false));
    document.getElementById("btn-pay-dp")?.addEventListener("click", () => toggleDPFieldPOS(true));
    document.getElementById("btn-finalisasi-transaksi")?.addEventListener("click", finalisasiTransaksiPOS);
    document.getElementById("btn-cetak-struk-last")?.addEventListener("click", cetakThermalPDFTerakhir);
    document.getElementById("btn-wa-struk-last")?.addEventListener("click", kirimWhatsAppStruks);

    // Module D, E, F: Sub-Form Form Actions
    document.getElementById("btn-pdf-customer")?.addEventListener("click", exportPDFCustomer);
    document.getElementById("form-retur-reject")?.addEventListener("submit", prosesSimpanRetur);
    document.getElementById("btn-pdf-retur")?.addEventListener("click", exportPDFRetur);
    document.getElementById("form-inventaris")?.addEventListener("submit", prosesSimpanInventaris);
    document.getElementById("btn-pdf-inventaris")?.addEventListener("click", exportPDFInventaris);
    document.getElementById("form-akuntansi-manual")?.addEventListener("submit", prosesSimpanAkuntansiManual);
    document.getElementById("akuntansi-filter-waktu")?.addEventListener("change", renderAkuntansiBukuBesar);
    document.getElementById("btn-pdf-akuntansi")?.addEventListener("click", exportPDFAkuntansi);
    document.getElementById("btn-excel-akuntansi")?.addEventListener("click", exportCSVExcelAkuntansi);
}

/**
 * 3. RETRIEVE GLOBAL PERIODE FILTER VALIDATION
 */
function getSelectedPeriodeYearMonth() {
    const val = document.getElementById("global-periode-filter")?.value || "2026-06";
    const parts = val.split("-");
    return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        raw: val
    };
}

function matchTimestampWithFilter(timestamp, filterRaw) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}` === filterRaw;
}

/**
 * MODULE A: CORE ENGINE LOGIC - MASTER CATALOG STOK PAKAIAN
 */
function injectWarnaMatriksRow() {
    const inputWarna = document.getElementById("stok-input-warna");
    const container = document.getElementById("container-matriks-warna");
    const warnaClean = inputWarna?.value?.trim();

    if (!warnaClean) return alert("Ketik nama varian warna terlebih dahulu!");

    // Check Duplicate
    const existingWarna = container.querySelector(`[data-warna="${warnaClean}"]`);
    if (existingWarna) return alert("Varian warna ini sudah dimasukkan ke daftar!");

    const blockWarna = document.createElement("div");
    blockWarna.setAttribute("data-warna", warnaClean);
    blockWarna.className = "bg-white p-3 rounded-xl border border-gray-200/80 space-y-2 relative";
    
    let htmlSizeChart = `
        <div class="flex justify-between items-center border-b border-gray-100 pb-1">
            <span class="text-xs font-black text-[#0F172A] uppercase flex items-center"><i class="fa-solid fa-palette mr-1 text-gray-400"></i> ${warnaClean}</span>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700 text-xs font-bold"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <div class="space-y-2 divide-y divide-gray-100">
    `;

    availableSizes.forEach(size => {
        htmlSizeChart += `
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 pt-2 items-center structure-size-row" data-size="${size}">
                <div class="text-xs font-black text-[#1E293B]">${size}</div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-400 uppercase">Stok</label>
                    <input type="number" placeholder="0" min="0" required class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5 text-xs font-bold field-stok">
                </div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-400 uppercase">HPP Asli</label>
                    <input type="number" placeholder="Rp" min="0" required class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5 text-xs field-hpp">
                </div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-400 uppercase">Jual Base</label>
                    <input type="number" placeholder="Rp" min="0" required class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5 text-xs field-jual">
                </div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-400 uppercase">WH / HT</label>
                    <div class="flex space-x-0.5">
                        <input type="number" placeholder="W" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-wh">
                        <input type="number" placeholder="H" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-ht">
                    </div>
                </div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-400 uppercase">TB Min-Max</label>
                    <div class="flex space-x-0.5">
                        <input type="number" placeholder="Min" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-tb-min">
                        <input type="number" placeholder="Max" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-tb-max">
                    </div>
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-[8px] font-bold text-gray-400 uppercase">BB Rec Min-Max (kg)</label>
                    <div class="flex space-x-0.5">
                        <input type="number" placeholder="Min" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-bb-min">
                        <input type="number" placeholder="Max" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-bb-max">
                    </div>
                </div>
            </div>
        `;
    });

    htmlSizeChart += `</div>`;
    blockWarna.innerHTML = htmlSizeChart;
    container.appendChild(blockWarna);
    inputWarna.value = "";
}

async function prosesSimpanStok() {
    const editId = document.getElementById("stok-edit-id").value;
    const modelNama = document.getElementById("stok-nama-model").value.trim();
    const kainJenis = document.getElementById("stok-jenis-kain").value.trim();
    const tipeGsm = document.getElementById("stok-tipe-gsm").value.trim();
    const detailProd = document.getElementById("stok-detail-produksi").value.trim();
    
    const containerWarna = document.getElementById("container-matriks-warna");
    const warnaBlocks = containerWarna.querySelectorAll("[data-warna]");
    
    if (warnaBlocks.length === 0) {
        return alert("Wajib memasukkan minimal 1 varian warna dengan spesifikasi chart ukurannya!");
    }

    let matriksVarianResult = [];

    // Looping Mengumpulkan Data Per Baris Secara Aman Melalui Penanda Objek Kelas CSS
    warnaBlocks.forEach(block => {
        const warnaWujud = block.getAttribute("data-warna");
        const sizeRows = block.querySelectorAll(".structure-size-row");
        
        sizeRows.forEach(row => {
            const ukuranSiz = row.getAttribute("data-size");
            matriksVarianResult.push({
                warna: warnaWujud,
                size: ukuranSiz,
                stok: parseInt(row.querySelector(".field-stok")?.value, 10) || 0,
                hpp_varian: parseFloat(row.querySelector(".field-hpp")?.value) || 0,
                jual_varian: parseFloat(row.querySelector(".field-jual")?.value) || 0,
                wh: parseFloat(row.querySelector(".field-wh")?.value) || 0,
                ht: parseFloat(row.querySelector(".field-ht")?.value) || 0,
                tb_min: parseFloat(row.querySelector(".field-tb-min")?.value) || 0,
                tb_max: parseFloat(row.querySelector(".field-tb-max")?.value) || 0,
                bb_min: parseFloat(row.querySelector(".field-bb-min")?.value) || 0,
                bb_max: parseFloat(row.querySelector(".field-bb-max")?.value) || 0
            });
        });
    });

    const payload = {
        nama_model: modelNama,
        jenis_kain: kainJenis,
        tipe_kain_gsm: tipeGsm,
        detail_produksi: detailProd,
        matriks_varian: matriksVarianResult,
        timestamp: Date.now()
    };

    if (editId) payload.id = parseInt(editId, 10);

    try {
        await saveData("store_produk", payload);
        document.getElementById("form-registrasi-stok").reset();
        document.getElementById("stok-edit-id").value = "";
        containerWarna.innerHTML = "";
        alert("Berhasil mengamankan data kain produk ke katalog browser!");
        refreshAllDataViews();
    } catch (err) {
        alert("Gagal melakukan penulisan database: " + err);
    }
}

async function renderTableStok() {
    const tBody = document.getElementById("table-body-stok");
    if (!tBody) return;
    tBody.innerHTML = "";

    const listProduk = await getStoreData("store_produk");
    if (listProduk.length === 0) {
        tBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400 font-medium">Gudang kosong. Belum ada data model pakaian.</td></tr>`;
        return;
    }

    // Anti-TypeError Guard: Penggunaan Optional Chaining Menyeluruh (.?)
    listProduk.forEach(prod => {
        const matriks = prod?.matriks_varian || [];
        let totalStokAset = 0;
        let ringkasanMap = {};

        matriks.forEach(v => {
            totalStokAset += (v?.stok || 0);
            if (!ringkasanMap[v?.warna]) ringkasanMap[v?.warna] = [];
            if ((v?.stok || 0) > 0) {
                ringkasanMap[v?.warna].push(`${v?.size}(${v?.stok}pcs)`);
            }
        });

        let ringkasanHtml = "";
        Object.keys(ringkasanMap).forEach(w => {
            const labelSize = ringkasanMap[w].length > 0 ? ringkasanMap[w].join(", ") : "Semua Ukuran Kosong";
            ringkasanHtml += `<div class="text-xs mb-1 font-semibold text-[#1E293B]"><span class="underline font-bold text-[#0F172A]">${w}</span>: ${labelSize}</div>`;
        });

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/80 transition-colors";
        tr.innerHTML = `
            <td class="p-3">
                <div class="font-extrabold text-[#0F172A]">${prod?.nama_model || "Tanpa Nama"}</div>
                <div class="text-[11px] text-gray-500 font-medium">${prod?.jenis_kain || "-"} (${prod?.tipe_kain_gsm || "-"})</div>
            </td>
            <td class="p-3">${ringkasanHtml}</td>
            <td class="p-3 text-center font-black text-sm text-[#0F172A]">${totalStokAset}</td>
            <td class="p-3 text-center">
                <div class="flex items-center justify-center space-x-1.5">
                    <button onclick="editProdukStok(${prod?.id})" class="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="hapusProdukStok(${prod?.id})" class="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

async function editProdukStok(id) {
    const list = await getStoreData("store_produk");
    const target = list.find(p => p.id === id);
    if (!target) return;

    document.getElementById("stok-edit-id").value = target?.id || "";
    document.getElementById("stok-nama-model").value = target?.nama_model || "";
    document.getElementById("stok-jenis-kain").value = target?.jenis_kain || "";
    document.getElementById("stok-tipe-gsm").value = target?.tipe_kain_gsm || "";
    document.getElementById("stok-detail-produksi").value = target?.detail_produksi || "";

    // Rekonstruksi Ulang Tampilan Blok Matriks Baris Ukuran
    const container = document.getElementById("container-matriks-warna");
    container.innerHTML = "";

    const matriks = target?.matriks_varian || [];
    // Kelompokkan Berdasarkan Warna
    let warnaGrup = {};
    matriks.forEach(v => {
        if (!warnaGrup[v.warna]) warnaGrup[v.warna] = [];
        warnaGrup[v.warna].push(v);
    });

    Object.keys(warnaGrup).forEach(wName => {
        const blockWarna = document.createElement("div");
        blockWarna.setAttribute("data-warna", wName);
        blockWarna.className = "bg-white p-3 rounded-xl border border-gray-200/80 space-y-2 relative";
        
        let htmlSizeChart = `
            <div class="flex justify-between items-center border-b border-gray-100 pb-1">
                <span class="text-xs font-black text-[#0F172A] uppercase flex items-center"><i class="fa-solid fa-palette mr-1 text-gray-400"></i> ${wName}</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700 text-xs font-bold"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="space-y-2 divide-y divide-gray-100">
        `;

        warnaGrup[wName].forEach(v => {
            htmlSizeChart += `
                <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 pt-2 items-center structure-size-row" data-size="${v.size}">
                    <div class="text-xs font-black text-[#1E293B]">${v.size}</div>
                    <div>
                        <input type="number" value="${v.stok || 0}" min="0" required class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5 text-xs font-bold field-stok">
                    </div>
                    <div>
                        <input type="number" value="${v.hpp_varian || 0}" min="0" required class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5 text-xs field-hpp">
                    </div>
                    <div>
                        <input type="number" value="${v.jual_varian || 0}" min="0" required class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5 text-xs field-jual">
                    </div>
                    <div>
                        <div class="flex space-x-0.5">
                            <input type="number" value="${v.wh || ""}" placeholder="W" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-wh">
                            <input type="number" value="${v.ht || ""}" placeholder="H" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-ht">
                        </div>
                    </div>
                    <div>
                        <div class="flex space-x-0.5">
                            <input type="number" value="${v.tb_min || ""}" placeholder="Min" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-tb-min">
                            <input type="number" value="${v.tb_max || ""}" placeholder="Max" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-tb-max">
                        </div>
                    </div>
                    <div class="sm:col-span-2">
                        <div class="flex space-x-0.5">
                            <input type="number" value="${v.bb_min || ""}" placeholder="Min" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-bb-min">
                            <input type="number" value="${v.bb_max || ""}" placeholder="Max" class="w-full bg-[#f5f5f7] border border-gray-200 rounded px-0.5 py-0.5 text-[10px] field-bb-max">
                        </div>
                    </div>
                </div>
            `;
        });

        htmlSizeChart += `</div>`;
        blockWarna.innerHTML = htmlSizeChart;
        container.appendChild(blockWarna);
    });
}

async function hapusProdukStok(id) {
    if (!confirm("Hapus model kain ini dari katalog? Tindakan ini permanen.")) return;
    await deleteData("store_produk", id);
    refreshAllDataViews();
}

/**
 * MODULE B: AUTOMATED ENGINE - MANAJEMEN HPP MULTI-CHANNEL
 */
async function updateHppSelectModelDropdown() {
    const selectModel = document.getElementById("hpp-select-model");
    if (!selectModel) return;
    selectModel.innerHTML = `<option value="">-- Pilih Model Pakaian --</option>`;

    const list = await getStoreData("store_produk");
    list.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nama_model;
        selectModel.appendChild(opt);
    });
}

async function updateHppSelectSizeDropdown() {
    const modelId = document.getElementById("hpp-select-model").value;
    const selectSize = document.getElementById("hpp-select-size");
    if (!selectSize) return;
    selectSize.innerHTML = `<option value="">-- Pilih Ukuran --</option>`;

    if (!modelId) return;
    const list = await getStoreData("store_produk");
    const target = list.find(p => p.id === parseInt(modelId, 10));
    if (!target) return;

    const matriks = target?.matriks_varian || [];
    // Ambil Unique Size per Varian Warna yang Tersedia
    let sizeSet = new Set();
    matriks.forEach(v => sizeSet.add(v.size));

    sizeSet.forEach(sz => {
        const opt = document.createElement("option");
        opt.value = sz;
        opt.textContent = `Ukuran ${sz}`;
        selectSize.appendChild(opt);
    });

    document.getElementById("hpp-biaya-kain-live").value = 0;
}

async function syncHppBiayaKainOtomatis() {
    const modelId = document.getElementById("hpp-select-model").value;
    const sizeVal = document.getElementById("hpp-select-size").value;
    const fieldLive = document.getElementById("hpp-biaya-kain-live");

    if (!modelId || !sizeVal) {
        if (fieldLive) fieldLive.value = 0;
        return;
    }

    const list = await getStoreData("store_produk");
    const target = list.find(p => p.id === parseInt(modelId, 10));
    if (!target) return;

    // Ambil Nilai HPP Varian Asli Pertama yang Cocok dari Katalog Ukuran
    const matchVarian = (target?.matriks_varian || []).find(v => v.size === sizeVal);
    if (fieldLive) {
        fieldLive.value = matchVarian ? (matchVarian.hpp_varian || 0) : 0;
    }
}

async function prosesSimpanHpp() {
    const editId = document.getElementById("hpp-edit-id").value;
    const modelId = document.getElementById("hpp-select-model").value;
    const sizeTerpilih = document.getElementById("hpp-select-size").value;
    const biayaKainLive = parseFloat(document.getElementById("hpp-biaya-kain-live").value) || 0;
    const ongkosJahit = parseFloat(document.getElementById("hpp-ongkos-jahit").value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-aplikasi-sablon").value) || 0;
    const packaging = parseFloat(document.getElementById("hpp-packaging").value) || 0;
    const marginPct = parseFloat(document.getElementById("hpp-margin-percent").value) || 0;

    // Ambil Data Manual % Potongan Marketplace Input User
    const cutWA = parseFloat(document.getElementById("admin-wa").value) || 0;
    const cutShopee = parseFloat(document.getElementById("admin-shopee").value) || 0;
    const cutTikTok = parseFloat(document.getElementById("admin-tiktok").value) || 0;
    const cutReseller = parseFloat(document.getElementById("admin-reseller").value) || 0;
    const cutGrosir = parseFloat(document.getElementById("admin-grosir").value) || 0;

    const listProd = await getStoreData("store_produk");
    const modelTarget = listProd.find(p => p.id === parseInt(modelId, 10));
    if (!modelTarget) return alert("Pilih model pakaian konveksi yang valid!");

    const hppTotal = biayaKainLive + ongkosJahit + sablon + packaging;
    const hargaJualDasar = hppTotal + (hppTotal * (marginPct / 100));

    // Formulasi Hitung Harga Naik Sesuai Potongan Komisi Multi-Channel Marketplace Manual
    const hitungChannelPrice = (basePrice, cutPercent) => {
        if (cutPercent >= 100) return basePrice;
        return basePrice / (1 - (cutPercent / 100));
    };

    const payload = {
        produk_id: parseInt(modelId, 10),
        nama_model: modelTarget.nama_model,
        size_terpilih: sizeTerpilih,
        biaya_kain_otomatis: biayaKainLive,
        ongkos_jahit: ongkosJahit,
        aplikasi_sablon: sablon,
        packaging: packaging,
        margin_percent: marginPct,
        hpp_total: hppTotal,
        harga_jual_dasar: hargaJualDasar,
        harga_jual_channels: {
            whatsapp: hitungChannelPrice(hargaJualDasar, cutWA),
            shopee: hitungChannelPrice(hargaJualDasar, cutShopee),
            tiktok: hitungChannelPrice(hargaJualDasar, cutTikTok),
            reseller: hitungChannelPrice(hargaJualDasar, cutReseller),
            grosir: hitungChannelPrice(hargaJualDasar, cutGrosir)
        },
        admin_percent_logs: { cutWA, cutShopee, cutTikTok, cutReseller, cutGrosir },
        timestamp: Date.now()
    };

    if (editId) payload.id = parseInt(editId, 10);

    await saveData("store_hpp", payload);
    document.getElementById("form-manajemen-hpp").reset();
    document.getElementById("hpp-edit-id").value = "";
    alert("Formulasi simulasi skema harga jual disimpan!");
    refreshAllDataViews();
}

async function renderTableHpp() {
    const tBody = document.getElementById("table-body-hpp");
    if (!tBody) return;
    tBody.innerHTML = "";

    const listHpp = await getStoreData("store_hpp");
    if (listHpp.length === 0) {
        tBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 font-medium">Belum ada kompilasi laporan simulasi HPP.</td></tr>`;
        return;
    }

    listHpp.forEach(h => {
        const ch = h?.harga_jual_channels || {};
        const logs = h?.admin_percent_logs || {};
        
        const stringChannel = `
            <div class="text-[11px] text-gray-600 space-y-0.5">
                <div>WA Retail (${logs.cutWA || 0}%): <span class="font-bold text-gray-900">Rp ${formatRupiah(ch.whatsapp)}</span></div>
                <div>Shopee (${logs.cutShopee || 0}%): <span class="font-bold text-gray-900">Rp ${formatRupiah(ch.shopee)}</span></div>
                <div>TikTok (${logs.cutTikTok || 0}%): <span class="font-bold text-gray-900">Rp ${formatRupiah(ch.tiktok)}</span></div>
                <div>Reseller (${logs.cutReseller || 0}%): <span class="font-bold text-gray-900">Rp ${formatRupiah(ch.reseller)}</span></div>
                <div>Grosir (${logs.cutGrosir || 0}%): <span class="font-bold text-gray-900">Rp ${formatRupiah(ch.grosir)}</span></div>
            </div>
        `;

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/80 transition-colors";
        tr.innerHTML = `
            <td class="p-3">
                <div class="font-extrabold text-[#0F172A]">${h?.nama_model || "Model Terhapus"}</div>
                <div class="text-[10px] font-bold text-blue-600 uppercase">Ukuran: ${h?.size_terpilih || "-"}</div>
            </td>
            <td class="p-3 text-right font-bold text-red-600">Rp ${formatRupiah(h?.hpp_total)}</td>
            <td class="p-3 text-right font-black text-emerald-600">Rp ${formatRupiah(h?.harga_jual_dasar)}</td>
            <td class="p-3">${stringChannel}</td>
            <td class="p-3 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <button onclick="editHpp(${h?.id})" class="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="hapusHpp(${h?.id})" class="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

async function editHpp(id) {
    const list = await getStoreData("store_hpp");
    const target = list.find(h => h.id === id);
    if (!target) return;

    document.getElementById("hpp-edit-id").value = target?.id || "";
    document.getElementById("hpp-select-model").value = target?.produk_id || "";
    await updateHppSelectSizeDropdown();
    
    document.getElementById("hpp-select-size").value = target?.size_terpilih || "";
    document.getElementById("hpp-biaya-kain-live").value = target?.biaya_kain_otomatis || 0;
    document.getElementById("hpp-ongkos-jahit").value = target?.ongkos_jahit || 0;
    document.getElementById("hpp-aplikasi-sablon").value = target?.aplikasi_sablon || 0;
    document.getElementById("hpp-packaging").value = target?.packaging || 0;
    document.getElementById("hpp-margin-percent").value = target?.margin_percent || 0;

    const logs = target?.admin_percent_logs || {};
    document.getElementById("admin-wa").value = logs.cutWA || 0;
    document.getElementById("admin-shopee").value = logs.cutShopee || 0;
    document.getElementById("admin-tiktok").value = logs.cutTikTok || 0;
    document.getElementById("admin-reseller").value = logs.cutReseller || 0;
    document.getElementById("admin-grosir").value = logs.cutGrosir || 0;
}

async function hapusHpp(id) {
    if (!confirm("Hapus simulasi HPP ini?")) return;
    await deleteData("store_hpp", id);
    refreshAllDataViews();
}

/**
 * MODULE C: TERMINAL POS KASIR ENGINE (ARRAY INTERACTIVE CART)
 */
async function updatePosSelectProdukDropdown() {
    const select = document.getElementById("pos-select-produk");
    if (!select) return;
    select.innerHTML = `<option value="">-- Pilih Item Sandang --</option>`;

    const list = await getStoreData("store_produk");
    list.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nama_model;
        select.appendChild(opt);
    });
}

async function updatePosVarianDropdown() {
    const modelId = document.getElementById("pos-select-produk").value;
    const selectVarian = document.getElementById("pos-select-varian");
    if (!selectVarian) return;
    selectVarian.innerHTML = `<option value="">-- Pilih Varian Fisik --</option>`;

    if (!modelId) return;
    const list = await getStoreData("store_produk");
    const target = list.find(p => p.id === parseInt(modelId, 10));
    if (!target) return;

    const matriks = target?.matriks_varian || [];
    matriks.forEach((v, index) => {
        const opt = document.createElement("option");
        // Gunakan gabungan index/string agar aman dibaca saat injeksi keranjang
        opt.value = `${index}|${v.warna}|${v.size}|${v.jual_varian}`;
        opt.textContent = `Warna: ${v.warna} | Size: ${v.size} (Tersedia: ${v.stok} pcs)`;
        selectVarian.appendChild(opt);
    });
}

async function tambahItemKeKeranjang() {
    const prodId = document.getElementById("pos-select-produk").value;
    const varianRaw = document.getElementById("pos-select-varian").value;
    const qtyInput = parseInt(document.getElementById("pos-input-qty").value, 10) || 1;
    const hargaKustom = parseFloat(document.getElementById("pos-input-harga-kustom").value);

    if (!prodId || !varianRaw) return alert("Pilih Produk dan Spesifikasi Varian Warnanya!");

    const listProd = await getStoreData("store_produk");
    const pTarget = listProd.find(p => p.id === parseInt(prodId, 10));
    if (!pTarget) return;

    const parts = varianRaw.split("|");
    const warnaTerpilih = parts[1];
    const sizeTerpilih = parts[2];
    const hargaSistemAsli = parseFloat(parts[3]) || 0;

    const hargaFinalPerItem = !isNaN(hargaKustom) && hargaKustom >= 0 ? hargaKustom : hargaSistemAsli;

    // Check If Item Same Is Exist on Current Temporer Cart Array
    const matchIndex = currentCart.findIndex(item => item.produk_id === pTarget.id && item.warna === warnaTerpilih && item.size === sizeTerpilih);

    if (matchIndex > -1) {
        currentCart[matchIndex].qty += qtyInput;
        currentCart[matchIndex].subtotal = currentCart[matchIndex].qty * currentCart[matchIndex].harga_satuan;
    } else {
        currentCart.push({
            produk_id: pTarget.id,
            nama_model: pTarget.nama_model,
            warna: warnaTerpilih,
            size: sizeTerpilih,
            qty: qtyInput,
            harga_satuan: hargaFinalPerItem,
            subtotal: qtyInput * hargaFinalPerItem
        });
    }

    document.getElementById("pos-input-qty").value = 1;
    document.getElementById("pos-input-harga-kustom").value = "";
    renderTableCartTemporer();
}

function renderTableCartTemporer() {
    const tBody = document.getElementById("table-body-keranjang");
    if (!tBody) return;
    tBody.innerHTML = "";

    if (currentCart.length === 0) {
        tBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 font-medium">Keranjang kosong. Sila pilih item di sisi kiri.</td></tr>`;
        hitungUlangGrandTotalPOS();
        return;
    }

    currentCart.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/60 text-xs";
        tr.innerHTML = `
            <td class="p-2.5">
                <div class="font-bold text-[#0F172A]">${item.nama_model}</div>
                <div class="text-[10px] text-gray-500">${item.warna} - Size ${item.size}</div>
            </td>
            <td class="p-2.5 text-center">
                <input type="number" min="1" value="${item.qty}" onchange="updateQtyCartItem(${index}, this.value)" class="w-12 text-center bg-gray-50 border border-gray-300 rounded font-bold">
            </td>
            <td class="p-2.5 text-right font-medium">Rp ${formatRupiah(item.harga_satuan)}</td>
            <td class="p-2.5 text-right font-black text-[#0F172A]">Rp ${formatRupiah(item.subtotal)}</td>
            <td class="p-2.5 text-center">
                <button onclick="hapusCartItem(${index})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-square-xmark text-base"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });

    hitungUlangGrandTotalPOS();
}

function updateQtyCartItem(index, value) {
    const valInt = parseInt(value, 10) || 1;
    if (currentCart[index]) {
        currentCart[index].qty = valInt;
        currentCart[index].subtotal = valInt * currentCart[index].harga_satuan;
    }
    renderTableCartTemporer();
}

function hapusCartItem(index) {
    currentCart.splice(index, 1);
    renderTableCartTemporer();
}

function hitungUlangGrandTotalPOS() {
    let bruto = 0;
    currentCart.forEach(i => bruto += i.subtotal);

    const diskonNilai = parseFloat(document.getElementById("pos-diskon-nilai").value) || 0;
    const diskonTipe = document.getElementById("pos-diskon-tipe").value;

    let potongan = 0;
    if (diskonTipe === "PERSEN") {
        potongan = bruto * (diskonNilai / 100);
    } else {
        potongan = diskonNilai;
    }

    const netom = Math.max(0, bruto - potongan);
    const labelTotal = document.getElementById("pos-text-grandtotal");
    if (labelTotal) labelTotal.textContent = `Rp ${formatRupiah(netom)}`;
    return netom;
}

function toggleDPFieldPOS(isDP) {
    const field = document.getElementById("pos-nominal-bayar-dp");
    const lunasBtn = document.getElementById("btn-pay-lunas");
    const dpBtn = document.getElementById("btn-pay-dp");

    if (isDP) {
        field?.classList.remove("hidden");
        dpBtn?.classList.add("bg-amber-600");
        lunasBtn?.classList.remove("bg-emerald-600");
        lunasBtn?.classList.add("bg-gray-400");
    } else {
        field?.classList.add("hidden");
        if (field) field.value = "";
        lunasBtn?.classList.add("bg-emerald-600");
        lunasBtn?.classList.remove("bg-gray-400");
        dpBtn?.classList.remove("bg-amber-600");
        dpBtn?.classList.add("bg-amber-500");
    }
}

async function finalisasiTransaksiPOS() {
    if (currentCart.length === 0) return alert("Tambahkan minimal 1 item sandang ke dalam keranjang kasir!");

    const cNama = document.getElementById("pos-customer-nama").value.trim();
    const cHp = document.getElementById("pos-customer-hp").value.trim();
    const tglOrder = document.getElementById("pos-tanggal-order").value;
    const tglEst = document.getElementById("pos-tanggal-estimasi").value;
    const ekspedisi = document.getElementById("pos-ekspedisi").value.trim() || "Ambil di Toko";
    const resi = document.getElementById("pos-resi").value.trim() || "-";

    if (!cNama || !cHp) return alert("Nama Pelanggan dan Nomor WhatsApp HP Wajib Diisi!");

    const grandTotalBill = hitungUlangGrandTotalPOS();
    const dpInputVal = parseFloat(document.getElementById("pos-nominal-bayar-dp").value) || 0;
    
    const isDPStatus = !document.getElementById("pos-nominal-bayar-dp").classList.contains("hidden");
    const uangMukaDP = isDPStatus ? dpInputVal : grandTotalBill;
    const sisaPiutang = isDPStatus ? Math.max(0, grandTotalBill - dpInputVal) : 0;
    const statusBayarText = sisaPiutang > 0 ? "BELUM_LUNAS_DP" : "LUNAS";

    const orderTimestamp = tglOrder ? new Date(tglOrder).getTime() : Date.now();

    // 1. Amankan Payload Masuk store_transaksi
    const payloadTransaksi = {
        customer_nama: cNama,
        customer_hp: cHp,
        tanggal_order_str: tglOrder,
        tanggal_estimasi_str: tglEst,
        ekspedisi: ekspedisi,
        resi: resi,
        items_keranjang: [...currentCart],
        grand_total: grandTotalBill,
        nominal_terbayar: uangMukaDP,
        piutang_nominal: sisaPiutang,
        status_pembayaran: statusBayarText,
        timestamp: orderTimestamp
    };

    try {
        const transId = await saveData("store_transaksi", payloadTransaksi);
        lastSavedTransactionId = transId;

        // 2. Potong Stok Fisik di store_produk secara Otomatis (Live Sync Engine)
        const listProduk = await getStoreData("store_produk");
        for (let item of currentCart) {
            let pTarget = listProduk.find(p => p.id === item.produk_id);
            if (pTarget) {
                pTarget.matriks_varian = (pTarget.matriks_varian || []).map(v => {
                    if (v.warna === item.warna && v.size === item.size) {
                        v.stok = Math.max(0, v.stok - item.qty);
                    }
                    return v;
                });
                await saveData("store_produk", pTarget);
            }
        }

        // 3. Injeksi Data CRM Customer Ke store_customer Otomatis
        const listCust = await getStoreData("store_customer");
        let existCust = listCust.find(c => c.nomor_hp === cHp);
        if (existCust) {
            existCust.total_transaksi = (existCust.total_transaksi || 0) + grandTotalBill;
            await saveData("store_customer", existCust);
        } else {
            await saveData("store_customer", {
                nama_customer: cNama,
                nomor_hp: cHp,
                total_transaksi: grandTotalBill,
                timestamp: Date.now()
            });
        }

        // 4. Injeksi Real-Time Otomatis ke Jurnal Jurnal Akuntansi Umum Keuangan
        await saveData("store_jurnal_akuntansi", {
            jenis_aliran: "POS_PENJUALAN",
            nominal: uangMukaDP, // Kas riil masuk saat ini (bisa Lunas / DP)
            keterangan: `[AUTO-POS] Invoice #${transId} Pelanggan an. ${cNama} (Total Nota: Rp ${formatRupiah(grandTotalBill)})`,
            timestamp: orderTimestamp,
            is_auto: true
        });

        alert(`Transaksi disimpan! Invoice Nomor ID: #${transId}`);
        
        // Aktifkan Tombol Cetak Struk & WhatsApp Khusus untuk ID Terakhir
        document.getElementById("btn-cetak-struk-last").disabled = false;
        document.getElementById("btn-cetak-struk-last").className = "w-full bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold py-2 px-1 rounded-md uppercase border border-slate-600 flex items-center justify-center space-x-1 cursor-pointer transition-colors";
        
        document.getElementById("btn-wa-struk-last").disabled = false;
        document.getElementById("btn-wa-struk-last").className = "w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 px-1 rounded-md uppercase border border-emerald-700 flex items-center justify-center space-x-1 cursor-pointer transition-colors";

        // Reset Formulir POS
        currentCart = [];
        document.getElementById("pos-customer-nama").value = "";
        document.getElementById("pos-customer-hp").value = "";
        document.getElementById("pos-ekspedisi").value = "";
        document.getElementById("pos-resi").value = "";
        document.getElementById("pos-diskon-nilai").value = "0";
        toggleDPFieldPOS(false);
        renderTableCartTemporer();
        refreshAllDataViews();

    } catch (err) {
        alert("Kegagalan memproses integrasi data POS: " + err);
    }
}

/**
 * MODULE D: DATABASE PELANGGAN (CRM LOG VIEW)
 */
async function renderTableCustomer() {
    const tBody = document.getElementById("table-body-customer");
    if (!tBody) return;
    tBody.innerHTML = "";

    const list = await getStoreData("store_customer");
    if (list.length === 0) {
        tBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400 font-medium">Belum ada rekam jejak riwayat customer terdaftar.</td></tr>`;
        return;
    }

    list.forEach(c => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/80 transition-colors";
        tr.innerHTML = `
            <td class="p-3 font-mono font-bold text-gray-400">#CUST-${c?.id}</td>
            <td class="p-3 text-xs text-gray-500">${formatTanggalIndo(c?.timestamp)}</td>
            <td class="p-3 font-extrabold text-[#0F172A]">${c?.nama_customer || "-"}</td>
            <td class="p-3 font-mono text-xs text-gray-600">${c?.nomor_hp || "-"}</td>
            <td class="p-3 text-right font-black text-emerald-600">Rp ${formatRupiah(c?.total_transaksi)}</td>
            <td class="p-3 text-center">
                <div class="flex justify-center space-x-1">
                    <button onclick="hapusCustomerCRM(${c?.id})" class="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

async function hapusCustomerCRM(id) {
    if (!confirm("Hapus customer ini dari catatan CRM?")) return;
    await deleteData("store_customer", id);
    renderTableCustomer();
}

/**
 * MODULE E: RETUR REJECT & INVENTARIS LOGISTIK LOGIC
 */
async function prosesSimpanRetur() {
    const editId = document.getElementById("retur-edit-id").value;
    const namaBarang = document.getElementById("retur-nama-barang").value.trim();
    const kat = document.getElementById("retur-kategori").value;
    const rugi = parseFloat(document.getElementById("retur-nilai-kerugian").value) || 0;

    const payload = {
        nama_barang: namaBarang,
        kategori: kat,
        nilai_kerugian: rugi,
        timestamp: Date.now()
    };

    if (editId) payload.id = parseInt(editId, 10);
    await saveData("store_retur_reject", payload);
    document.getElementById("form-retur-reject").reset();
    document.getElementById("retur-edit-id").value = "";
    refreshAllDataViews();
}

async function renderTableRetur() {
    const tBody = document.getElementById("table-body-retur");
    if (!tBody) return;
    tBody.innerHTML = "";

    const list = await getStoreData("store_retur_reject");
    if (list.length === 0) {
        tBody.innerHTML = `<tr><td colspan="4" class="p-2 text-center text-gray-400">Log nihil.</td></tr>`;
        return;
    }

    list.forEach(r => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-2 font-medium">${r?.nama_barang}</td>
            <td class="p-2"><span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${r?.kategori === 'CACAT_PRODUKSI' ? 'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}">${r?.kategori}</span></td>
            <td class="p-2 text-right font-bold text-red-600">Rp ${formatRupiah(r?.nilai_kerugian)}</td>
            <td class="p-2 text-center">
                <button onclick="deleteData('store_retur_reject', ${r?.id}).then(refreshAllDataViews)" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

async function prosesSimpanInventaris() {
    const editId = document.getElementById("inv-edit-id").value;
    const namaAset = document.getElementById("inv-nama-aset").value.trim();
    const hBeli = parseFloat(document.getElementById("inv-harga-beli").value) || 0;
    const bSusut = parseFloat(document.getElementById("inv-biaya-susut").value) || 0;

    const payload = {
        nama_aset: namaAset,
        harga_beli: hBeli,
        biaya_penyusutan: bSusut,
        timestamp: Date.now()
    };

    if (editId) payload.id = parseInt(editId, 10);
    await saveData("store_inventaris", payload);
    document.getElementById("form-inventaris").reset();
    document.getElementById("inv-edit-id").value = "";
    refreshAllDataViews();
}

async function renderTableInventaris() {
    const tBody = document.getElementById("table-body-inventaris");
    if (!tBody) return;
    tBody.innerHTML = "";

    const list = await getStoreData("store_inventaris");
    if (list.length === 0) {
        tBody.innerHTML = `<tr><td colspan="4" class="p-2 text-center text-gray-400">Aset nihil.</td></tr>`;
        return;
    }

    list.forEach(i => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-2 font-medium">${i?.nama_aset}</td>
            <td class="p-2 text-right">Rp ${formatRupiah(i?.harga_beli)}</td>
            <td class="p-2 text-right text-gray-500">Rp ${formatRupiah(i?.biaya_penyusutan)}</td>
            <td class="p-2 text-center">
                <button onclick="deleteData('store_inventaris', ${i?.id}).then(refreshAllDataViews)" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

/**
 * MODULE F: BUKU BESAR AKUNTANSI KEUANGAN & NERACA METRIKS LIVE SYNC
 */
async function prosesSimpanAkuntansiManual() {
    const editId = document.getElementById("akuntansi-edit-id").value;
    const jAliran = document.getElementById("akun-jenis-aliran").value;
    const nominal = parseFloat(document.getElementById("akun-nominal").value) || 0;
    const ket = document.getElementById("akun-keterangan").value.trim();

    const payload = {
        jenis_aliran: jAliran,
        nominal: nominal,
        keterangan: ket,
        timestamp: Date.now(),
        is_auto: false
    };

    if (editId) payload.id = parseInt(editId, 10);

    await saveData("store_jurnal_akuntansi", payload);
    document.getElementById("form-akuntansi-manual").reset();
    document.getElementById("akuntansi-edit-id").value = "";
    alert("Catatan kas finansial non-POS berhasil diamankan!");
    refreshAllDataViews();
}

async function calculateAndRenderFinancialCards(jurnalSemua, periodFilterRaw) {
    let totalModalInput = 0;
    let totalUangMasukManual = 0;
    let totalPengeluaranManual = 0;
    let totalPembelianBahan = 0;
    let totalOmsetPenjualanPOS = 0;
    let totalPiutangDP = 0;

    // Ambil Data Pendukung Nilai Kerugian & Penyusutan untuk Laba Bersih Riil Jangka Panjang
    const listRetur = await getStoreData("store_retur_reject");
    const listInv = await getStoreData("store_inventaris");

    let totalRugiReject = 0;
    listRetur.forEach(r => {
        if (matchTimestampWithFilter(r.timestamp, periodFilterRaw)) {
            totalRugiReject += (r.nilai_kerugian || 0);
        }
    });

    let totalSusutAsetAparat = 0;
    listInv.forEach(i => {
        totalSusutAsetAparat += (i.biaya_penyusutan || 0);
    });

    // Kalkulasi Berdasarkan Filter Periode Global Terpilih
    jurnalSemua.forEach(log => {
        if (matchTimestampWithFilter(log.timestamp, periodFilterRaw)) {
            if (log.jenis_aliran === "MODAL_AWAL") totalModalInput += log.nominal;
            else if (log.jenis_aliran === "UANG_MASUK") totalUangMasukManual += log.nominal;
            else if (log.jenis_aliran === "PENGELUARAN_OPERASIONAL") totalPengeluaranManual += log.nominal;
            else if (log.jenis_aliran === "PEMBELIAN_BAHAN") totalPembelianBahan += log.nominal;
            else if (log.jenis_aliran === "POS_PENJUALAN") totalOmsetPenjualanPOS += log.nominal;
        }
    });

    // Hitung Piutang Masuk Dari Log Transaksi POS Kasir Langsung yang belum lunas
    const listTrans = await getStoreData("store_transaksi");
    listTrans.forEach(t => {
        if (matchTimestampWithFilter(t.timestamp, periodFilterRaw)) {
            totalPiutangDP += (t.piutang_nominal || 0);
        }
    });

    // RUMUS MATEMATIKA FORMULA UTAMA (Sesuai Spesifikasi Dokumen):
    // Sisa Modal Berjalan = Total Modal + Total Uang Masuk Manual - Total Pengeluaran Manual - Total Pembelian Bahan
    const sisaModalBerjalan = totalModalInput + totalUangMasukManual - totalPengeluaranManual - totalPembelianBahan;
    
    // Laba Bersih Riil = (Total Omset Penjualan + Total Uang Masuk Manual) - (Total Pengeluaran Manual + Total Pembelian Bahan + Nilai Kerugian Barang Reject/Retur + Biaya Penyusutan Aset Alat)
    const labaBersihRiil = (totalOmsetPenjualanPOS + totalUangMasukManual) - (totalPengeluaranManual + totalPembelianBahan + totalRugiReject + totalSusutAsetAparat);

    // Render ke Elemen Kartu DOM Atas
    document.getElementById("card-total-modal").textContent = `Rp ${formatRupiah(totalModalInput)}`;
    document.getElementById("card-sisa-modal").textContent = `Rp ${formatRupiah(sisaModalBerjalan)}`;
    document.getElementById("card-total-omset").textContent = `Rp ${formatRupiah(totalOmsetPenjualanPOS)}`;
    document.getElementById("card-total-piutang").textContent = `Rp ${formatRupiah(totalPiutangDP)}`;
    
    const labelLaba = document.getElementById("card-laba-bersih");
    if (labelLaba) {
        labelLaba.textContent = `Rp ${formatRupiah(labaBersihRiil)}`;
        if (labaBersihRiil < 0) labelLaba.className = "text-base font-black text-red-400 mt-2 block break-all";
        else labelLaba.className = "text-base font-black text-emerald-400 mt-2 block break-all";
    }
}

async function renderAkuntansiBukuBesar() {
    const tBody = document.getElementById("table-body-akuntansi");
    if (!tBody) return;
    tBody.innerHTML = "";

    const periodObj = getSelectedPeriodeYearMonth();
    const filterWaktuSub = document.getElementById("akuntansi-filter-waktu").value; // SEMUA, HARI_INI, dsb

    const jurnalSemua = await getStoreData("store_jurnal_akuntansi");
    
    // Sinkronisasi Hitungan Angka Kartu Finansial Mengikuti Periode Bulan Berjalan Global
    await calculateAndRenderFinancialCards(jurnalSemua, periodObj.raw);

    // Saring Data untuk Keperluan View Tabel Buku Besar
    let filteredLogs = jurnalSemua.filter(log => matchTimestampWithFilter(log.timestamp, periodObj.raw));

    const sSat = new Date();
    const hariIniString = sSat.toISOString().split('T')[0];

    if (filterWaktuSub === "HARI_INI") {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === hariIniString);
    } else if (filterWaktuSub === "MINGGU_INI") {
        const s7Hari = Date.now() - (7 * 24 * 60 * 60 * 1000);
        filteredLogs = filteredLogs.filter(log => log.timestamp >= s7Hari);
    } else if (filterWaktuSub === "TAHUN_INI") {
        filteredLogs = jurnalSemua.filter(log => new Date(log.timestamp).getFullYear() === periodObj.year);
    }

    // Urutkan Kronologis Berdasarkan Waktu input Terkini (Descending)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    if (filteredLogs.length === 0) {
        tBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 font-medium">Buku besar kosong untuk filter periodik ini.</td></tr>`;
        return;
    }

    filteredLogs.forEach(log => {
        let labelWarnaAliran = "text-gray-700";
        if (log.jenis_aliran === "MODAL_AWAL" || log.jenis_aliran === "UANG_MASUK" || log.jenis_aliran === "POS_PENJUALAN") {
            labelWarnaAliran = "text-emerald-600 font-extrabold";
        } else {
            labelWarnaAliran = "text-red-600 font-medium";
        }

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/80 transition-colors";
        
        let aksiHtml = `<span class="text-gray-400 text-[10px] italic">System Locked</span>`;
        if (log.is_auto === false) {
            aksiHtml = `
                <div class="flex items-center justify-center space-x-1">
                    <button onclick="editAkuntansiManual(${log.id})" class="text-blue-600 px-1 py-0.5 rounded hover:bg-blue-50"><i class="fa-solid fa-marker"></i></button>
                    <button onclick="hapusAkuntansiManual(${log.id})" class="text-red-500 px-1 py-0.5 rounded hover:bg-red-50"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td class="p-3 font-mono text-gray-500">${formatTanggalIndo(log.timestamp)}</td>
            <td class="p-3"><span class="text-[10px] font-bold uppercase">${log.jenis_aliran}</span></td>
            <td class="p-3 max-w-xs whitespace-normal font-medium text-[#0F172A]">${log.keterangan}</td>
            <td class="p-3 text-right ${labelWarnaAliran}">Rp ${formatRupiah(log.nominal)}</td>
            <td class="p-3 text-center">${aksiHtml}</td>
        `;
        tBody.appendChild(tr);
    });
}

async function editAkuntansiManual(id) {
    const list = await getStoreData("store_jurnal_akuntansi");
    const target = list.find(l => l.id === id);
    if (!target) return;

    document.getElementById("akuntansi-edit-id").value = target?.id || "";
    document.getElementById("akun-jenis-aliran").value = target?.jenis_aliran || "";
    document.getElementById("akun-nominal").value = target?.nominal || 0;
    document.getElementById("akun-keterangan").value = target?.keterangan || "";
}

async function hapusAkuntansiManual(id) {
    if (!confirm("Lenyapkan log data finansial manual ini secara instan?")) return;
    await deleteData("store_jurnal_akuntansi", id);
    refreshAllDataViews();
}

/**
 * 4. TERMINAL POS LOGISTIK: DOKUMEN THERMAL STRUK PDF & AUTOMATION LINK WHATSAPP
 */
async function cetakThermalPDFTerakhir() {
    if (!lastSavedTransactionId) return alert("Belum ada transaksi POS yang diselesaikan pada sesi ini!");
    
    const listTrans = await getStoreData("store_transaksi");
    const t = listTrans.find(x => x.id === lastSavedTransactionId);
    if (!t) return alert("Data transaksi tidak ditemukan!");

    const { jsPDF } = window.jspdf;
    // Format Ukuran Struk Kasir Gulung Kertas Thermal Kecil Lebar 80mm kustom
    const doc = new jsPDF({ unit: "mm", format: [80, 150 + (t.items_keranjang.length * 15)] });

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text("CLOTHVERS SYSTEM", 40, 10, { align: "center" });
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("ERP Single-Page v1.0 Serverless", 40, 14, { align: "center" });
    doc.text("----------------------------------------", 40, 18, { align: "center" });

    doc.text(`Nota ID   : #${t.id}`, 5, 23);
    doc.text(`Pelanggan : ${t.customer_nama}`, 5, 27);
    doc.text(`WhatsApp  : ${t.customer_hp}`, 5, 31);
    doc.text(`Tgl Order : ${t.tanggal_order_str || "-"}`, 5, 35);
    doc.text(`Est Kirim : ${t.tanggal_estimasi_str || "-"}`, 5, 39);
    doc.text(`Logistik  : ${t.ekspedisi} (${t.resi})`, 5, 43);
    doc.text("----------------------------------------", 40, 48, { align: "center" });

    let yPos = 53;
    t.items_keranjang.forEach(item => {
        doc.setFont("courier", "bold");
        doc.text(`${item.nama_model}`, 5, yPos);
        yPos += 4;
        doc.setFont("courier", "normal");
        doc.text(`  [${item.warna}-${item.size}]  ${item.qty}x Rp${formatRupiah(item.harga_satuan)}`, 5, yPos);
        doc.text(`Rp${formatRupiah(item.subtotal)}`, 75, yPos, { align: "right" });
        yPos += 5;
    });

    doc.text("----------------------------------------", 40, yPos, { align: "center" });
    yPos += 5;
    doc.setFont("courier", "bold");
    doc.text("GRAND TOTAL :", 5, yPos);
    doc.text(`Rp ${formatRupiah(t.grand_total)}`, 75, yPos, { align: "right" });
    
    yPos += 4;
    doc.text("TERBAYAR    :", 5, yPos);
    doc.text(`Rp ${formatRupiah(t.nominal_terbayar)}`, 75, yPos, { align: "right" });

    yPos += 4;
    doc.text("SISA PIUTANG:", 5, yPos);
    doc.text(`Rp ${formatRupiah(t.piutang_nominal)}`, 75, yPos, { align: "right" });
    
    yPos += 8;
    doc.setFont("courier", "italic");
    doc.text("Terima kasih atas pesanan Anda.", 40, yPos, { align: "center" });
    yPos += 4;
    doc.text("Made by Clothvers x Elevatio", 40, yPos, { align: "center" });

    doc.save(`Struk_Thermal_Clothvers_${t.id}.pdf`);
}

async function kirimWhatsAppStruks() {
    if (!lastSavedTransactionId) return;
    const listTrans = await getStoreData("store_transaksi");
    const t = listTrans.find(x => x.id === lastSavedTransactionId);
    if (!t) return;

    let textNota = `*NOTA TRANSAKSI CLOTHVERS SYSTEM v1.0*\n`;
    textNota += `----------------------------------------\n`;
    textNota += `Invoice ID : #${t.id}\n`;
    textNota += `Pelanggan  : ${t.customer_nama}\n`;
    textNota += `Tgl Order  : ${t.tanggal_order_str}\n`;
    textNota += `Est Selesai: ${t.tanggal_estimasi_str}\n`;
    textNota += `Ekspedisi  : ${t.ekspedisi} (${t.resi})\n`;
    textNota += `----------------------------------------\n`;
    
    t.items_keranjang.forEach((item, idx) => {
        textNota += `${idx+1}. ${item.nama_model} (${item.warna} - Size ${item.size})\n`;
        textNota += `   Qty: ${item.qty} x Rp ${formatRupiah(item.harga_satuan)} -> Rp ${formatRupiah(item.subtotal)}\n`;
    });
    
    textNota += `----------------------------------------\n`;
    textNota += `*TOTAL BILL  : Rp ${formatRupiah(t.grand_total)}*\n`;
    textNota += `*TERBAYAR    : Rp ${formatRupiah(t.nominal_terbayar)}*\n`;
    textNota += `*SISA PIUTANG: Rp ${formatRupiah(t.piutang_nominal)}*\n\n`;
    textNota += `Status Pembayaran: *${t.status_pembayaran}*\n`;
    textNota += `Simpan nota digital ini sebagai bukti antrean PO sah.\n`;
    textNota += `Terima kasih atas kerja samanya. Powered by Clothvers x Elevatio.`;

    const urlWA = `https://wa.me/${t.customer_hp}?text=${encodeURIComponent(textNota)}`;
    window.open(urlWA, "_blank");
}

/**
 * 5. COLLECTIVE PDF GENERATOR SYSTEM VIA AUTO-TABLE LINK
 */
async function exportPDFStok() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("LAPORAN MASTER DATA STOK KATALOG CLOTHVERS", 14, 15);
    
    const list = await getStoreData("store_produk");
    let rows = [];
    list.forEach(p => {
        let strVarian = (p.matriks_varian || []).map(v => `${v.warna}-${v.size}[Stok:${v.stok}, HPP:Rp${v.hpp_varian}, TB:${v.tb_min}-${v.tb_max}cm, BB:${v.bb_min}-${v.bb_max}kg]`).join("\n");
        rows.push([p.id, p.nama_model, `${p.jenis_kain} (${p.tipe_kain_gsm})`, strVarian]);
    });

    doc.autoTable({
        startY: 22,
        head: [["ID", "Model Pakaian", "Spesifikasi Kain Mentah", "Rincian Matriks Varian Chart Size"]],
        body: rows,
        styles: { fontSize: 8, overflow: 'linebreak' }
    });
    doc.save("Laporan_Master_Stok_Clothvers.pdf");
}

async function exportPDFHpp() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("LAPORAN SIMULASI HPP & MULTI-CHANNEL PRICING", 14, 15);

    const list = await getStoreData("store_hpp");
    let rows = [];
    list.forEach(h => {
        const ch = h.harga_jual_channels || {};
        const logs = h.admin_percent_logs || {};
        const strCh = `WA Retail: Rp${formatRupiah(ch.whatsapp)}\nShopee: Rp${formatRupiah(ch.shopee)}\nTikTok: Rp${formatRupiah(ch.tiktok)}\nReseller: Rp${formatRupiah(ch.reseller)}\nGrosir: Rp${formatRupiah(ch.grosir)}`;
        rows.push([h.nama_model, h.size_terpilih, `Rp ${formatRupiah(h.hpp_total)}`, `Rp ${formatRupiah(h.harga_jual_dasar)}`, strCh]);
    });

    doc.autoTable({
        startY: 22,
        head: [["Model Pakaian", "Size", "HPP Total", "Harga Jual Dasar", "Simulasi Bersih Per Channel Marketplace"]],
        body: rows,
        styles: { fontSize: 8 }
    });
    doc.save("Laporan_Manajemen_HPP_Clothvers.pdf");
}

async function exportPDFCustomer() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("DATABASE LAPORAN UTAMA LOG CRM CUSTOMER", 14, 15);

    const list = await getStoreData("store_customer");
    let rows = list.map(c => [c.id, formatTanggalIndo(c.timestamp), c.nama_customer, c.nomor_hp, `Rp ${formatRupiah(c.total_transaksi)}`]);

    doc.autoTable({
        startY: 22,
        head: [["ID Pelanggan", "Tanggal Join", "Nama Customer", "Nomor Kontak WA", "Akumulasi Belanja"]],
        body: rows
    });
    doc.save("Database_Customer_Clothvers.pdf");
}

async function exportPDFRetur() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("LAPORAN JURNAL LOG RETUR & REJECT BARANG", 14, 15);
    const list = await getStoreData("store_retur_reject");
    let rows = list.map(r => [formatTanggalIndo(r.timestamp), r.nama_barang, r.kategori, `Rp ${formatRupiah(r.nilai_kerugian)}`]);
    doc.autoTable({ startY: 22, head: [["Tanggal", "Nama Barang / Varian", "Kasus Kategori", "Kerugian Riil"]], body: rows });
    doc.save("Laporan_Kasus_Retur_Reject.pdf");
}

async function exportPDFInventaris() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("LAPORAN MANAJEMEN ASET INVENTARIS", 14, 15);
    const list = await getStoreData("store_inventaris");
    let rows = list.map(i => [i.id, i.nama_aset, `Rp ${formatRupiah(i.harga_beli)}`, `Rp ${formatRupiah(i.biaya_penyusutan)}`]);
    doc.autoTable({ startY: 22, head: [["ID Aset", "Nama Aset Kerja", "Harga Awal", "Beban Susut / Bulan"]], body: rows });
    doc.save("Laporan_Aset_Konveksi.pdf");
}

async function exportPDFAkuntansi() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const currentPeriode = getSelectedPeriodeYearMonth().raw;
    doc.text(`JURNAL UMUM BUKU BESAR AKUNTANSI KEUANGAN - PERIODE ${currentPeriode}`, 14, 15);

    const list = await getStoreData("store_jurnal_akuntansi");
    let filtered = list.filter(l => matchTimestampWithFilter(l.timestamp, currentPeriode));
    filtered.sort((a,b) => a.timestamp - b.timestamp);

    let rows = filtered.map(l => [formatTanggalIndo(l.timestamp), l.jenis_aliran, l.keterangan, `Rp ${formatRupiah(l.nominal)}`]);

    doc.autoTable({
        startY: 22,
        head: [["Tanggal & Jam Log", "Kategori Aliran Kas", "Keterangan Memo Laporan", "Nominal Kas"]],
        body: rows
    });
    doc.save(`Jurnal_Akuntansi_Clothvers_${currentPeriode}.pdf`);
}

/**
 * 6. BULK SPREADSHEET EXPORTER ENGINE - CSV ACCURATE DELIMITER
 */
async function exportCSVExcelAkuntansi() {
    const currentPeriode = getSelectedPeriodeYearMonth().raw;
    const list = await getStoreData("store_jurnal_akuntansi");
    let filtered = list.filter(l => matchTimestampWithFilter(l.timestamp, currentPeriode));
    filtered.sort((a,b) => a.timestamp - b.timestamp);

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Tanggal,Kategori Aliran Kas,Memo Keterangan,Nominal Angka Rp\n";

    filtered.forEach(l => {
        let cleanKet = l.keterangan.replace(/,/g, ";"); // Mencegah Malformasi Kolom Excel Akibat Koma
        csvContent += `${l.id},${formatTanggalIndo(l.timestamp)},${l.jenis_aliran},${cleanKet},${l.nominal}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Buku_Besar_Clothvers_Akuntansi_${currentPeriode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 7. LOCAL DATA SYNC BRIDGE BACKUP PANEL LOGIC
 */
async function backupDatabaseToJSON() {
    const payloadBackup = {
        store_produk: await getStoreData("store_produk"),
        store_hpp: await getStoreData("store_hpp"),
        store_transaksi: await getStoreData("store_transaksi"),
        store_jurnal_akuntansi: await getStoreData("store_jurnal_akuntansi"),
        store_retur_reject: await getStoreData("store_retur_reject"),
        store_inventaris: await getStoreData("store_inventaris"),
        store_customer: await getStoreData("store_customer"),
        exported_at: Date.now(),
        app_signature: "Clothvers_System_v1.0"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payloadBackup));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `CLOTHVERS_ERP_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
}

function restoreDatabaseFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.app_signature !== "Clothvers_System_v1.0") {
                return alert("File JSON tidak dikenali! Gagal melakukan sinkronisasi luring.");
            }

            // Mulai Proses Inject Menimpa Data Lokal Lama Secara Berurutan (Offline Sync Bridge)
            const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject", "store_inventaris", "store_customer"];
            for (let sName of stores) {
                if (Array.isArray(parsed[sName])) {
                    // Bersihkan toko lokal saat ini terlebih dahulu
                    const tx = db.transaction(sName, "readwrite");
                    const store = tx.objectStore(sName);
                    store.clear();
                    
                    for (let item of parsed[sName]) {
                        await saveData(sName, item);
                    }
                }
            }

            alert("Sinkronisasi database offline berhasil! Seluruh data diperbarui.");
            refreshAllDataViews();
        } catch (err) {
            alert("Gagal membaca struktur file JSON cadangan: " + err);
        }
    };
    reader.readAsText(file);
}

/**
 * 8. HELPER REUSABLE UTILITIES
 */
function refreshAllDataViews() {
    renderTableStok();
    updateHppSelectModelDropdown();
    updateHppSelectSizeDropdown();
    renderTableHpp();
    updatePosSelectProdukDropdown();
    updatePosVarianDropdown();
    renderTableCustomer();
    renderTableRetur();
    renderTableInventaris();
    renderAkuntansiBukuBesar();
}

function formatRupiah(angka) {
    if (angka === undefined || angka === null || isNaN(angka)) return "0";
    return Math.round(angka).toLocaleString("id-ID");
}

function formatTanggalIndo(timestamp) {
    if (!timestamp) return "-";
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getBulanNama(num) {
    const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return bln[num - 1] || "";
}
