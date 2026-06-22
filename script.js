/**
 * CLOTHVERS SYSTEM V1.0 - CORE INTERFACE & ENGINE APPLICATION LOGIC
 * Architecture: Serverless ERP / Client-Side Financial Architecture
 */

let dbInstance = null;
const DB_NAME = "ClothversDB";
const DB_VERSION = 1;
const SYSTEM_SIZES = ["S", "M", "L", "XL", "2XL"];
let transactionalPlatformChartObj = null;

// Initializer Bootstrapper Ekosistem Aplikasi
document.addEventListener("DOMContentLoaded", () => {
    initializeIndexedDBEngine();
    buildDynamicSizeMatrixGridForm();
    establishGlobalPeriodFilterHandlers();
});

// Setup Sinkronisasi Filter Global Periode Real-Time
function establishGlobalPeriodFilterHandlers() {
    const selectorBulan = document.getElementById("global-filter-bulan");
    const selectorTahun = document.getElementById("global-filter-tahun");
    
    // Set Default 2026 Sesuai Mandat Regulasi
    selectorBulan.value = "06";
    selectorTahun.value = "2026";

    selectorBulan.addEventListener("change", triggerGlobalSubsystemRefresh);
    selectorTahun.addEventListener("change", triggerGlobalSubsystemRefresh);
}

function triggerGlobalSubsystemRefresh() {
    renderTableStokMaster();
    renderTableHPPMaster();
    rebuildDropdownModelsSelectors();
    renderTablePOSLogs();
    renderTableReturLogs();
    renderTableInventarisAset();
    executeRenderBukuAkumulasiLedger();
}

// -------------------------------------------------------------------------
// DATABASE STORAGE NODE: INDEXEDDB CORE ENGINE
// -------------------------------------------------------------------------
function initializeIndexedDBEngine() {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onerror = (event) => {
        console.error("IndexedDB critical error connection failed:", event.target.error);
    };

    openRequest.onsuccess = (event) => {
        dbInstance = event.target.result;
        triggerGlobalSubsystemRefresh();
    };

    openRequest.onupgradeneeded = (event) => {
        const dbRef = event.target.result;
        
        if (!dbRef.objectStoreNames.contains("store_produk")) {
            dbRef.createObjectStore("store_produk", { keyPath: "id", autoIncrement: true });
        }
        if (!dbRef.objectStoreNames.contains("store_hpp")) {
            dbRef.createObjectStore("store_hpp", { keyPath: "id", autoIncrement: true });
        }
        if (!dbRef.objectStoreNames.contains("store_transaksi")) {
            dbRef.createObjectStore("store_transaksi", { keyPath: "id", autoIncrement: true });
        }
        if (!dbRef.objectStoreNames.contains("store_jurnal_akuntansi")) {
            dbRef.createObjectStore("store_jurnal_akuntansi", { keyPath: "id", autoIncrement: true });
        }
        if (!dbRef.objectStoreNames.contains("store_retur_reject")) {
            dbRef.createObjectStore("store_retur_reject", { keyPath: "id", autoIncrement: true });
        }
        if (!dbRef.objectStoreNames.contains("store_inventaris")) {
            dbRef.createObjectStore("store_inventaris", { keyPath: "id_aset", autoIncrement: true });
        }
    };
}

function accessObjectStore(storeName, mode = "readonly") {
    const tx = dbInstance.transaction(storeName, mode);
    return tx.objectStore(storeName);
}

// -------------------------------------------------------------------------
// UI CONTROLLER: SUB-DASHBOARD TABS VIEW ENGINE
// -------------------------------------------------------------------------
function switchModule(moduleId) {
    document.querySelectorAll(".modul-viewspace").forEach(block => block.classList.add("hidden"));
    document.getElementById(`modul-${moduleId}`).classList.remove("hidden");

    document.querySelectorAll("#main-sidebar-nav button").forEach(btn => {
        btn.classList.remove("bg-[#1E293B]", "text-white");
        btn.classList.add("text-[#1E293B]", "hover:bg-gray-200/70");
    });

    const activeBtn = document.getElementById(`btn-nav-${moduleId}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-[#1E293B]", "hover:bg-gray-200/70");
        activeBtn.classList.add("bg-[#1E293B]", "text-white");
    }

    const titleDictionary = {
        stok: "Master Stok Pakaian", hpp: "Manajemen HPP & Pricing", pos: "Terminal POS Kasir & Transaksi",
        retur: "Retur & Barang Cacat", inventaris: "Inventaris Alat Kerja", keuangan: "Akuntansi & Keuangan", sync: "Backup & Sync Bridge"
    };
    document.getElementById("module-display-title").innerText = titleDictionary[moduleId];
    triggerGlobalSubsystemRefresh();
}

function toggleSubDashboardKeuanganTabs(subId) {
    document.querySelectorAll(".subview-keuangan-container").forEach(view => view.classList.add("hidden"));
    document.getElementById(`subview-${subId}`).classList.remove("hidden");

    document.querySelectorAll(".sub-keuangan-btn").forEach(btn => {
        btn.classList.remove("bg-[#1E293B]", "text-white");
        btn.classList.add("text-gray-500", "hover:bg-gray-100");
    });
    
    const mappedButtons = { "input-kas-manual": "tab-sub-input-kas", "buku-akumulasi-ledger": "tab-sub-buku-ledger" };
    document.querySelectorAll("#modul-keuangan button").forEach(b => {
        if(b.id === mappedButtons[subId]) {
            b.className = "px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-lg bg-[#1E293B] text-white transition-all";
        } else if (b.id === "tab-sub-input-kas" || b.id === "tab-sub-buku-ledger") {
            b.className = "px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-lg text-gray-500 hover:bg-gray-100 transition-all";
        }
    });
    triggerGlobalSubsystemRefresh();
}

// -------------------------------------------------------------------------
// MODUL A: MASTER STOK PAKAIAN ENGINE
// -------------------------------------------------------------------------
function buildDynamicSizeMatrixGridForm() {
    const container = document.getElementById("size-matrix-tbody");
    container.innerHTML = "";
    SYSTEM_SIZES.forEach(size => {
        container.innerHTML += `
            <tr data-matrix-size="${size}">
                <td class="py-2 text-xs font-black text-[#0F172A]">${size}</td>
                <td class="py-2"><input type="text" class="cell-warna border border-gray-200 rounded-lg p-1.5 text-xs w-28 font-bold" placeholder="Misal: Navy Blue" required></td>
                <td class="py-2"><input type="number" class="cell-stok border border-gray-200 rounded-lg p-1.5 text-xs w-20 font-mono font-bold" value="0" min="0" required></td>
                <td class="py-2"><input type="number" class="cell-hpp border border-gray-200 rounded-lg p-1.5 text-xs w-24 font-mono font-bold" value="0" min="0" required></td>
                <td class="py-2"><input type="number" class="cell-jual border border-gray-200 rounded-lg p-1.5 text-xs w-24 font-mono font-bold" value="0" min="0" required></td>
                <td class="py-2"><input type="text" class="cell-wh border border-gray-200 rounded-lg p-1.5 text-xs w-16" placeholder="54"></td>
                <td class="py-2"><input type="text" class="cell-ht border border-gray-200 rounded-lg p-1.5 text-xs w-16" placeholder="72"></td>
                <td class="py-2"><input type="text" class="cell-rec border border-gray-200 rounded-lg p-1.5 text-xs w-28" placeholder="170cm/65kg"></td>
            </tr>
        `;
    });
}

document.getElementById("form-master-stok").addEventListener("submit", function(e) {
    e.preventDefault();
    const idModifier = document.getElementById("input-stok-id-modifier").value;
    const currentStampPeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const matriksVarianCollected = [];
    document.querySelectorAll("#size-matrix-tbody tr").forEach(row => {
        matriksVarianCollected.push({
            size: row.dataset.matrixSize,
            warna: row.querySelector(".cell-warna").value,
            stok: parseInt(row.querySelector(".cell-stok").value) || 0,
            hpp_varian: parseFloat(row.querySelector(".cell-hpp").value) || 0,
            jual_varian: parseFloat(row.querySelector(".cell-jual").value) || 0,
            wh: row.querySelector(".cell-wh").value,
            ht: row.querySelector(".cell-ht").value,
            bb_rec: row.querySelector(".cell-rec").value
        });
    });

    const payloadProduk = {
        nama_model: document.getElementById("stok-nama-model").value,
        jenis_kain: document.getElementById("stok-jenis-kain").value,
        tipe_kain_gsm: document.getElementById("stok-tipe-gsm").value,
        detail_produksi: document.getElementById("stok-detail-produksi").value,
        matriks_varian: matriksVarianCollected,
        periode_filter: currentStampPeriod
    };

    const store = accessObjectStore("store_produk", "readwrite");
    let operation;
    if (idModifier) {
        payloadProduk.id = parseInt(idModifier);
        operation = store.put(payloadProduk);
    } else {
        operation = store.add(payloadProduk);
    }

    operation.onsuccess = () => {
        clearFormStok();
        triggerGlobalSubsystemRefresh();
    };
});

function clearFormStok() {
    document.getElementById("input-stok-id-modifier").value = "";
    document.getElementById("form-master-stok").reset();
    buildDynamicSizeMatrixGridForm();
}

function renderTableStokMaster() {
    const tbody = document.getElementById("table-stok-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    accessObjectStore("store_produk").getAll().onsuccess = (e) => {
        const filteredRecords = e.target.result.filter(record => record.periode_filter === activePeriod);
        filteredRecords.forEach(item => {
            let totalUnitModel = item.matriks_varian.reduce((total, v) => total + v.stok, 0);
            let varianSpansMarkup = item.matriks_varian.map(v => 
                `<span class="inline-block bg-white border border-gray-200 text-[#1E293B] rounded-md px-2 py-1 m-0.5 font-mono shadow-3xs">
                    <b>${v.size}</b> (${v.warna}): Qty <b>${v.stok}</b> | HPP: Rp${v.hpp_varian.toLocaleString()} | Dimensi: ${v.wh}x${v.ht}
                </span>`
            ).join("");

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50">
                    <td class="p-4 font-black text-[#0F172A]">
                        ${item.nama_model}<br>
                        <span class="text-[11px] text-gray-400 font-bold">${item.jenis_kain} (${item.tipe_kain_gsm})</span>
                    </td>
                    <td class="p-4 max-w-xl">${varianSpansMarkup}</td>
                    <td class="p-4 font-black text-sm text-[#1E293B]">${totalUnitModel} Pcs</td>
                    <td class="p-4 text-center space-x-1 whitespace-nowrap">
                        <button onclick="editStokRecord(${item.id})" class="text-xs bg-amber-500 text-white font-black px-3 py-1.5 rounded-lg shadow-2xs hover:bg-amber-600">Edit</button>
                        <button onclick="deleteStokRecord(${item.id})" class="text-xs bg-rose-700 text-white font-black px-3 py-1.5 rounded-lg shadow-2xs hover:bg-rose-800">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function editStokRecord(id) {
    accessObjectStore("store_produk").get(id).onsuccess = (e) => {
        const data = e.target.result;
        document.getElementById("input-stok-id-modifier").value = data.id;
        document.getElementById("stok-nama-model").value = data.nama_model;
        document.getElementById("stok-jenis-kain").value = data.jenis_kain;
        document.getElementById("stok-tipe-gsm").value = data.tipe_kain_gsm;
        document.getElementById("stok-detail-produksi").value = data.detail_produksi;

        data.matriks_varian.forEach(v => {
            const tr = document.querySelector(`#size-matrix-tbody tr[data-matrix-size="${v.size}"]`);
            if (tr) {
                tr.querySelector(".cell-warna").value = v.warna;
                tr.querySelector(".cell-stok").value = v.stok;
                tr.querySelector(".cell-hpp").value = v.hpp_varian;
                tr.querySelector(".cell-jual").value = v.jual_varian;
                tr.querySelector(".cell-wh").value = v.wh;
                tr.querySelector(".cell-ht").value = v.ht;
                tr.querySelector(".cell-rec").value = v.bb_rec;
            }
        });
    };
}

function deleteStokRecord(id) {
    if (confirm("Apakah anda yakin ingin menghapus data model kain dari master stok ini secara permanen?")) {
        accessObjectStore("store_produk", "readwrite").delete(id).onsuccess = () => triggerGlobalSubsystemRefresh();
    }
}

function downloadPDFMassalMasterStok() {
    const { jsPDF } = window.jspdf;
    const documentPDF = new jsPDF('l', 'mm', 'a4');
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;
    
    documentPDF.setFont("helvetica", "bold");
    documentPDF.text(`LAPORAN KONSOLIDASI MASAL INVENTORI PAKAIAN STOK - CLOTHVERS SYSTEM (${period})`, 14, 14);
    
    accessObjectStore("store_produk").getAll().onsuccess = (e) => {
        const rawList = e.target.result.filter(r => r.periode_filter === period);
        const autoTableRows = [];
        
        rawList.forEach(m => {
            m.matriks_varian.forEach(v => {
                autoTableRows.push([
                    m.nama_model, m.jenis_kain, m.tipe_kain_gsm, v.size, v.warna, v.stok, `Rp ${v.hpp_varian.toLocaleString()}`, `Rp ${v.jual_varian.toLocaleString()}`, `${v.wh}x${v.ht}`
                ]);
            });
        });
        
        documentPDF.autoTable({
            head: [['Nama Model', 'Jenis Kain', 'GSM', 'Size', 'Warna Varian', 'Stok Fisik', 'HPP Asli', 'Harga POS', 'Size Chart']],
            body: autoTableRows,
            startY: 22,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 41, 59] }
        });
        documentPDF.save(`CLOTHVERS_MASS_STOK_${period}.pdf`);
    };
}

// -------------------------------------------------------------------------
// MODUL B: MANAJEMEN HPP LOGIC (AUTOMATED LIVE SYNC ENGINE)
// -------------------------------------------------------------------------
function rebuildDropdownModelsSelectors() {
    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;
    const els = ["hpp-select-model", "pos-select-model", "retur-select-model"];
    
    accessObjectStore("store_produk").getAll().onsuccess = (e) => {
        const dataset = e.target.result.filter(r => r.periode_filter === activePeriod);
        let optionsMarkup = `<option value="">-- Hubungkan Model --</option>`;
        dataset.forEach(item => {
            optionsMarkup += `<option value="${item.id}">${item.nama_model}</option>`;
        });
        
        els.forEach(selectorId => {
            const elDom = document.getElementById(selectorId);
            if(elDom) elDom.innerHTML = optionsMarkup;
        });
    };
}

function executeLiveSyncBiayaKain() {
    const targetedModelId = document.getElementById("hpp-select-model").value;
    const targetedSize = document.getElementById("hpp-select-size").value;
    const lockInputField = document.getElementById("hpp-kain-auto-lock");

    if (!targetedModelId) {
        lockInputField.value = 0;
        return;
    }

    accessObjectStore("store_produk").get(parseInt(targetedModelId)).onsuccess = (e) => {
        const modelObj = e.target.result;
        const matchingVarian = modelObj.matriks_varian.find(v => v.size === targetedSize);
        lockInputField.value = matchingVarian ? matchingVarian.hpp_varian : 0;
        calculateKalkulasiSkemaHPP();
    };
}

function calculateKalkulasiSkemaHPP() {
    const lockedKainCost = parseFloat(document.getElementById("hpp-kain-auto-lock").value) || 0;
    const jahitCost = parseFloat(document.getElementById("hpp-ongkos-jahit").value) || 0;
    const sablonCost = parseFloat(document.getElementById("hpp-aplikasi-sablon").value) || 0;
    const packagingCost = parseFloat(document.getElementById("hpp-biaya-packaging").value) || 0;
    const marginTargetPercentage = parseFloat(document.getElementById("hpp-target-margin").value) || 0;

    const totalHppAkumulasi = lockedKainCost + jahitCost + sablonCost + packagingCost;
    document.getElementById("hpp-total-akumulasi").value = totalHppAkumulasi;

    // Pricing Engine Simulation Formula Berbasis Target Margin %
    const baseCleanJualPrice = totalHppAkumulasi / (1 - (marginTargetPercentage / 100));

    // Ambil Input Manual Parameter Potongan Biaya Admin Multi-Channel Marketplace
    const waFee = parseFloat(document.getElementById("fee-admin-wa").value) || 0;
    const shopeeFee = parseFloat(document.getElementById("fee-admin-shopee").value) || 0;
    const tiktokFee = parseFloat(document.getElementById("fee-admin-tiktok").value) || 0;
    const resellerFee = parseFloat(document.getElementById("fee-admin-reseller").value) || 0;
    const grosirFee = parseFloat(document.getElementById("fee-admin-grosir").value) || 0;

    document.getElementById("price-target-wa").innerText = `Rp ${Math.round(baseCleanJualPrice / (1 - (waFee / 100))).toLocaleString()}`;
    document.getElementById("price-target-shopee").innerText = `Rp ${Math.round(baseCleanJualPrice / (1 - (shopeeFee / 100))).toLocaleString()}`;
    document.getElementById("price-target-tiktok").innerText = `Rp ${Math.round(baseCleanJualPrice / (1 - (tiktokFee / 100))).toLocaleString()}`;
    document.getElementById("price-target-reseller").innerText = `Rp ${Math.round(baseCleanJualPrice / (1 - (resellerFee / 100))).toLocaleString()}`;
    document.getElementById("price-target-grosir").innerText = `Rp ${Math.round(baseCleanJualPrice / (1 - (grosirFee / 100))).toLocaleString()}`;
}

document.getElementById("form-manajemen-hpp").addEventListener("submit", function(e) {
    e.preventDefault();
    const idMod = document.getElementById("input-hpp-id-modifier").value;
    const modelNode = document.getElementById("hpp-select-model");
    const labelModelName = modelNode.options[modelNode.selectedIndex].text;
    const stampPeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const payloadHpp = {
        model_id: parseInt(modelNode.value),
        nama_model: labelModelName,
        size_terpilih: document.getElementById("hpp-select-size").value,
        biaya_kain_otomatis: parseFloat(document.getElementById("hpp-kain-auto-lock").value) || 0,
        ongkos_jahit: parseFloat(document.getElementById("hpp-ongkos-jahit").value) || 0,
        aplikasi_sablon: parseFloat(document.getElementById("hpp-aplikasi-sablon").value) || 0,
        packaging: parseFloat(document.getElementById("hpp-biaya-packaging").value) || 0,
        margin_percent: parseFloat(document.getElementById("hpp-target-margin").value) || 0,
        hpp_total: parseFloat(document.getElementById("hpp-total-akumulasi").value) || 0,
        periode_filter: stampPeriod,
        harga_jual_channels: {
            whatsapp: document.getElementById("price-target-wa").innerText,
            shopee: document.getElementById("price-target-shopee").innerText,
            tiktok: document.getElementById("price-target-tiktok").innerText,
            reseller: document.getElementById("price-target-reseller").innerText,
            grosir: document.getElementById("price-target-grosir").innerText
        }
    };

    const store = accessObjectStore("store_hpp", "readwrite");
    let req = idMod ? store.put({...payloadHpp, id: parseInt(idMod)}) : store.add(payloadHpp);

    req.onsuccess = () => {
        document.getElementById("input-hpp-id-modifier").value = "";
        document.getElementById("form-manajemen-hpp").reset();
        triggerGlobalSubsystemRefresh();
    };
});

function renderTableHPPMaster() {
    const tbody = document.getElementById("table-hpp-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    accessObjectStore("store_hpp").getAll().onsuccess = (e) => {
        const list = e.target.result.filter(r => r.periode_filter === activePeriod);
        list.forEach(h => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50">
                    <td class="p-4 font-black text-[#0F172A]">${h.nama_model} <span class="bg-gray-200 text-[#1E293B] text-[10px] font-mono px-2 py-0.5 rounded ml-1">Size ${h.size_terpilih}</span></td>
                    <td class="p-4 text-[11px] text-gray-500 font-bold font-mono">
                        Kain: Rp${h.biaya_kain_otomatis.toLocaleString()} | Jahit: Rp${h.ongkos_jahit.toLocaleString()} | Sablon: Rp${h.aplikasi_sablon.toLocaleString()}
                    </td>
                    <td class="p-4 font-black text-rose-700">Rp ${h.hpp_total.toLocaleString()}</td>
                    <td class="p-4 text-[11px] space-y-0.5 font-bold">
                        <span class="block text-gray-700">WA: ${h.harga_jual_channels.whatsapp}</span>
                        <span class="block text-orange-600">Shopee: ${h.harga_jual_channels.shopee}</span>
                        <span class="block text-pink-600">TikTok: ${h.harga_jual_channels.tiktok}</span>
                        <span class="block text-blue-600">Reseller: ${h.harga_jual_channels.reseller}</span>
                        <span class="block text-purple-600">Grosir: ${h.harga_jual_channels.grosir}</span>
                    </td>
                    <td class="p-4 text-center space-x-1 whitespace-nowrap">
                        <button onclick="editHPPRecord(${h.id})" class="text-xs bg-amber-500 text-white font-black px-2.5 py-1.5 rounded-lg">Edit</button>
                        <button onclick="deleteHPPRecord(${h.id})" class="text-xs bg-rose-700 text-white font-black px-2.5 py-1.5 rounded-lg">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function editHPPRecord(id) {
    accessObjectStore("store_hpp").get(id).onsuccess = (e) => {
        const data = e.target.result;
        document.getElementById("input-hpp-id-modifier").value = data.id;
        document.getElementById("hpp-select-model").value = data.model_id;
        document.getElementById("hpp-select-size").value = data.size_terpilih;
        document.getElementById("hpp-kain-auto-lock").value = data.biaya_kain_otomatis;
        document.getElementById("hpp-ongkos-jahit").value = data.ongkos_jahit;
        document.getElementById("hpp-aplikasi-sablon").value = data.aplikasi_sablon;
        document.getElementById("hpp-biaya-packaging").value = data.packaging;
        document.getElementById("hpp-target-margin").value = data.margin_percent;
        calculateKalkulasiSkemaHPP();
    };
}

function deleteHPPRecord(id) {
    if (confirm("Hapus skema analisis HPP ini?")) {
        accessObjectStore("store_hpp", "readwrite").delete(id).onsuccess = () => triggerGlobalSubsystemRefresh();
    }
}

function downloadPDFMassalManajemenHPP() {
    const { jsPDF } = window.jspdf;
    const docPDF = new jsPDF('l', 'mm', 'a4');
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    docPDF.setFont("helvetica", "bold");
    docPDF.text(`LAPORAN MANAJEMEN SKEMA HPP & PRICING MULTI-CHANNEL (${period})`, 14, 14);

    accessObjectStore("store_hpp").getAll().onsuccess = (e) => {
        const dataset = e.target.result.filter(r => r.periode_filter === period);
        const rows = dataset.map(h => [
            h.nama_model, h.size_terpilih, `Rp ${h.hpp_total.toLocaleString()}`, h.harga_jual_channels.whatsapp, h.harga_jual_channels.shopee, h.harga_jual_channels.tiktok, h.harga_jual_channels.reseller, h.harga_jual_channels.grosir
        ]);

        docPDF.autoTable({
            head: [['Nama Model', 'Size', 'Total HPP', 'Harga WA', 'Harga Shopee', 'Harga TikTok', 'Harga Reseller', 'Harga Grosir']],
            body: rows,
            startY: 22,
            headStyles: { fillColor: [15, 23, 42] }
        });
        docPDF.save(`CLOTHVERS_MASS_HPP_${period}.pdf`);
    };
}

// -------------------------------------------------------------------------
// MODUL C: TERMINAL POS KASIR (PRICING MATRIX & STOCK DEDUCTION ENGINE)
// -------------------------------------------------------------------------
function executeFetchHargaDinamisPOSSize() {
    const modelId = document.getElementById("pos-select-model").value;
    const targetSize = document.getElementById("pos-select-size").value;
    const outputField = document.getElementById("pos-harga-terkunci");

    if (!modelId) return;

    accessObjectStore("store_produk").get(parseInt(modelId)).onsuccess = (e) => {
        const produk = e.target.result;
        const subVarian = produk.matriks_varian.find(v => v.size === targetSize);
        outputField.value = subVarian ? subVarian.jual_varian : 0;
        calculateKalkulasiKasirBelanjaPOS();
    };
}

function calculateKalkulasiKasirBelanjaPOS() {
    const hargaSatuan = parseFloat(document.getElementById("pos-harga-terkunci").value) || 0;
    const totalQty = parseInt(document.getElementById("pos-input-qty").value) || 1;
    const dpMasuk = parseFloat(document.getElementById("pos-input-dp").value) || 0;

    const akumulasiSubtotal = hargaSatuan * totalQty;
    const sisaPiutangTagihan = akumulasiSubtotal - dpMasuk;

    document.getElementById("pos-text-subtotal").innerText = `Rp ${akumulasiSubtotal.toLocaleString()}`;
    document.getElementById("pos-text-sisa").innerText = `Rp ${sisaPiutangTagihan.toLocaleString()}`;
}

document.getElementById("form-terminal-pos").addEventListener("submit", function(e) {
    e.preventDefault();
    const modelId = document.getElementById("pos-select-model").value;
    const modelLabel = document.getElementById("pos-select-model").options[document.getElementById("pos-select-model").selectedIndex].text;
    const size = document.getElementById("pos-select-size").value;
    const qty = parseInt(document.getElementById("pos-input-qty").value) || 1;
    const hargaSatuan = parseFloat(document.getElementById("pos-harga-terkunci").value) || 0;
    const dp = parseFloat(document.getElementById("pos-input-dp").value) || 0;
    const channel = document.getElementById("pos-select-channel").value;
    const currentStampPeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const transactionTx = dbInstance.transaction(["store_transaksi", "store_produk"], "readwrite");
    const storeProduk = transactionTx.objectStore("store_produk");
    const storeTrx = transactionTx.objectStore("store_transaksi");

    storeProduk.get(parseInt(modelId)).onsuccess = (ev) => {
        const targetProduk = ev.target.result;
        const indexVarian = targetProduk.matriks_varian.findIndex(v => v.size === size);
        
        if (indexVarian !== -1) {
            if (targetProduk.matriks_varian[indexVarian].stok < qty) {
                alert(`Kegagalan Nota POS! Ketersediaan fisik stok model size ${size} tidak mencukupi permintaan (Sisa: ${targetProduk.matriks_varian[indexVarian].stok} Pcs).`);
                return;
            }
            // Otomasi Potong Stok Fisik Terintegrasi
            targetProduk.matriks_varian[indexVarian].stok -= qty;
            storeProduk.put(targetProduk);
        }

        const logPayloadPOS = {
            tanggal: new Date().toISOString().split('T')[0],
            model_id: parseInt(modelId),
            nama_model: modelLabel,
            size: size,
            qty: qty,
            total: hargaSatuan * qty,
            dp: dp,
            sisa: (hargaSatuan * qty) - dp,
            channel: channel,
            periode_filter: currentStampPeriod
        };

        storeTrx.add(logPayloadPOS).onsuccess = () => {
            document.getElementById("form-terminal-pos").reset();
            triggerGlobalSubsystemRefresh();
        };
    };
}


);

function renderTablePOSLogs() {
    const tbody = document.getElementById("table-pos-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const sebaranOmsetMap = { "WhatsApp": 0, "Shopee": 0, "TikTok": 0, "Reseller": 0, "Grosir": 0 };

    accessObjectStore("store_transaksi").getAll().onsuccess = (e) => {
        const logs = e.target.result.filter(t => t.periode_filter === activePeriod);
        logs.forEach(t => {
            if (sebaranOmsetMap[t.channel] !== undefined) {
                sebaranOmsetMap[t.channel] += t.total;
            }
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50">
                    <td class="p-3 font-mono text-gray-500">${t.tanggal}</td>
                    <td class="p-3 font-black text-[#0F172A]">${t.nama_model} (${t.size}) <span class="text-xs text-[#396399]">x${t.qty}</span></td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded bg-gray-200 text-[#1E293B] font-bold font-mono text-[10px]">${t.channel}</span></td>
                    <td class="p-3">Rp ${t.total.toLocaleString()} <span class="text-[10px] text-emerald-600 block">(DP: Rp ${t.dp.toLocaleString()})</span></td>
                    <td class="p-3 font-mono font-black ${t.sisa > 0 ? 'text-rose-600' : 'text-gray-400'}">Rp ${t.sisa.toLocaleString()}</td>
                    <td class="p-3 text-center">
                        <button onclick="deletePOSLogTrx(${t.id})" class="text-rose-700 hover:underline font-black">Hapus</button>
                    </td>
                </tr>
            `;
        });
        buildResponsiveChartEngine(sebaranOmsetMap);
    };
}

function deletePOSLogTrx(id) {
    if (confirm("Hapus catatan riwayat transaksi kasir POS ini?")) {
        accessObjectStore("store_transaksi", "readwrite").delete(id).onsuccess = () => triggerGlobalSubsystemRefresh();
    }
}

function buildResponsiveChartEngine(dataObject) {
    const canvasCtx = document.getElementById("chartFinansialPlatformPOS");
    if (!canvasCtx) return;
    if (transactionalPlatformChartObj) { transactionalPlatformChartObj.destroy(); }

    transactionalPlatformChartObj = new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(dataObject),
            datasets: [{
                label: 'Volume Penjualan Bruto (Rp)',
                data: Object.values(dataObject),
                backgroundColor: ['#1E293B', '#ea580c', '#db2777', '#2563eb', '#9333ea'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: "#f1f5f9" } }, x: { grid: { display: false } } }
        }
    });
}

// -------------------------------------------------------------------------
// MODUL D: RETUR & BARANG CACAT (REJECT LOGIC)
// -------------------------------------------------------------------------
document.getElementById("form-kasus-retur").addEventListener("submit", function(e) {
    e.preventDefault();
    const modelNode = document.getElementById("retur-select-model");
    const labelModel = modelNode.options[modelNode.selectedIndex].text;
    const currentPeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const payloadRetur = {
        tanggal: new Date().toISOString().split('T')[0],
        model_id: parseInt(modelNode.value),
        nama_model: labelModel,
        size: document.getElementById("retur-select-size").value,
        jenis: document.getElementById("retur-select-jenis").value,
        qty: parseInt(document.getElementById("retur-input-qty").value) || 1,
        kronologi: document.getElementById("retur-input-kronologi").value,
        periode_filter: currentPeriod
    };

    accessObjectStore("store_retur_reject", "readwrite").add(payloadRetur).onsuccess = () => {
        document.getElementById("form-kasus-retur").reset();
        triggerGlobalSubsystemRefresh();
    };
});

function renderTableReturLogs() {
    const tbody = document.getElementById("table-retur-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    accessObjectStore("store_retur_reject").getAll().onsuccess = (e) => {
        const entries = e.target.result.filter(r => r.periode_filter === activePeriod);
        entries.forEach(r => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50">
                    <td class="p-4 font-mono">${r.tanggal}</td>
                    <td class="p-4 font-black text-[#0F172A]">${r.nama_model} <span class="font-mono text-gray-400">(${r.size})</span></td>
                    <td class="p-4"><span class="px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase ${r.jenis.includes('Cacat') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${r.jenis}</span></td>
                    <td class="p-4 font-mono font-black">${r.qty} Pcs</td>
                    <td class="p-4 text-xs font-semibold text-gray-500">${r.kronologi}</td>
                    <td class="p-4 text-center">
                        <button onclick="deleteReturLog(${r.id})" class="text-xs bg-rose-700 text-white px-2 py-1 rounded font-bold">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function deleteReturLog(id) {
    if (confirm("Hapus dokumentasi kasus kerusakan produk / retur ini?")) {
        accessObjectStore("store_retur_reject", "readwrite").delete(id).onsuccess = () => triggerGlobalSubsystemRefresh();
    }
}

// -------------------------------------------------------------------------
// MODUL E: INVENTARIS ALAT KERJA (CRUD ASET & DEPRECIATION ENGINE)
// -------------------------------------------------------------------------
document.getElementById("form-inventaris-aset").addEventListener("submit", function(e) {
    e.preventDefault();
    const idMod = document.getElementById("input-inv-id-modifier").value;
    const qty = parseInt(document.getElementById("inv-input-qty").value) || 0;
    const hargaSatuan = parseFloat(document.getElementById("inv-input-harga").value) || 0;
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const payloadAset = {
        tanggal_beli: document.getElementById("inv-input-tanggal").value,
        nama_alat: document.getElementById("inv-input-nama").value,
        kategori: document.getElementById("inv-input-kategori").value,
        kuantitas: qty,
        harga_satuan: hargaSatuan,
        total_nilai: qty * hargaSatuan,
        masa_habis_pakai_bulan: parseInt(document.getElementById("inv-input-susut").value) || 12,
        periode_filter: period
    };

    const store = accessObjectStore("store_inventaris", "readwrite");
    let req = idMod ? store.put({...payloadAset, id_aset: parseInt(idMod)}) : store.add(payloadAset);

    req.onsuccess = () => {
        clearFormInventaris();
        triggerGlobalSubsystemRefresh();
    };
});

function clearFormInventaris() {
    document.getElementById("input-inv-id-modifier").value = "";
    document.getElementById("form-inventaris-aset").reset();
}

function renderTableInventarisAset() {
    const tbody = document.getElementById("table-inventaris-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    accessObjectStore("store_inventaris").getAll().onsuccess = (e) => {
        const dataset = e.target.result.filter(i => i.periode_filter === activePeriod);
        dataset.forEach(i => {
            let nominalPenyusutanBulanan = i.total_nilai / i.masa_habis_pakai_bulan;
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/50">
                    <td class="p-4 font-mono">${i.tanggal_beli}</td>
                    <td class="p-4 font-black text-[#0F172A]">${i.nama_alat}<br><span class="text-[10px] text-gray-400 uppercase font-black">${i.kategori}</span></td>
                    <td class="p-4 font-mono font-bold">${i.kuantitas} Unit x Rp${i.harga_satuan.toLocaleString()}</td>
                    <td class="p-4 font-mono font-black text-[#1E293B]">Rp ${i.total_nilai.toLocaleString()}</td>
                    <td class="p-4 font-mono font-black text-rose-600">Rp ${Math.round(nominalPenyusutanBulanan).toLocaleString()} <span class="text-[9px] text-gray-400 block">/ Bulan</span></td>
                    <td class="p-4 text-center space-x-1 whitespace-nowrap">
                        <button onclick="editInventarisAset(${i.id_aset})" class="text-xs bg-amber-500 text-white font-black px-2.5 py-1.5 rounded-lg">Edit</button>
                        <button onclick="deleteInventarisAset(${i.id_aset})" class="text-xs bg-rose-700 text-white font-black px-2.5 py-1.5 rounded-lg">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function editInventarisAset(id) {
    accessObjectStore("store_inventaris").get(id).onsuccess = (e) => {
        const i = e.target.result;
        document.getElementById("input-inv-id-modifier").value = i.id_aset;
        document.getElementById("inv-input-tanggal").value = i.tanggal_beli;
        document.getElementById("inv-input-nama").value = i.nama_alat;
        document.getElementById("inv-input-kategori").value = i.kategori;
        document.getElementById("inv-input-qty").value = i.kuantitas;
        document.getElementById("inv-input-harga").value = i.harga_satuan;
        document.getElementById("inv-input-susut").value = i.masa_habis_pakai_bulan;
    };
}

function deleteInventarisAset(id) {
    if (confirm("Hapus entri inventaris alat kerja/kapitalisasi modal ini?")) {
        accessObjectStore("store_inventaris", "readwrite").delete(id).onsuccess = () => triggerGlobalSubsystemRefresh();
    }
}

function downloadPDFMassalInventarisAset() {
    const { jsPDF } = window.jspdf;
    const pdfDoc = new jsPDF('p', 'mm', 'a4');
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(`LAPORAN KEKAYAAN NERACA INVENTARIS ASET ALAT (${period})`, 14, 14);

    accessObjectStore("store_inventaris").getAll().onsuccess = (e) => {
        const items = e.target.result.filter(i => i.periode_filter === period);
        const rows = items.map(i => [
            i.tanggal_beli, i.nama_alat, i.kategori, i.kuantitas, `Rp ${i.harga_satuan.toLocaleString()}`, `Rp ${i.total_nilai.toLocaleString()}`, `${i.masa_habis_pakai_bulan} Bln`
        ]);

        pdfDoc.autoTable({
            head: [['Tanggal Beli', 'Nama Alat/Aset', 'Kategori', 'Qty', 'Harga Satuan', 'Total Nilai', 'Masa Susut']],
            body: rows,
            startY: 22,
            headStyles: { fillColor: [30, 41, 59] }
        });
        pdfDoc.save(`CLOTHVERS_INVENTARIS_MASSAL_${period}.pdf`);
    };
}

// -------------------------------------------------------------------------
// MODUL F: AKUNTANSI & KEUANGAN (GENERAL LEDGER REAL-TIME SYSTEM)
// -------------------------------------------------------------------------
document.getElementById("form-jurnal-manual").addEventListener("submit", function(e) {
    e.preventDefault();
    const idModifier = document.getElementById("input-jurnal-id-modifier").value;
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;

    const payloadJurnal = {
        tanggal: document.getElementById("jurnal-input-tanggal").value,
        tipe: document.getElementById("jurnal-input-tipe").value,
        nominal: parseFloat(document.getElementById("jurnal-input-nominal").value) || 0,
        keterangan: document.getElementById("jurnal-input-keterangan").value,
        periode_filter: period
    };

    const store = accessObjectStore("store_jurnal_akuntansi", "readwrite");
    let req = idModifier ? store.put({...payloadJurnal, id: parseInt(idModifier)}) : store.add(payloadJurnal);

    req.onsuccess = () => {
        document.getElementById("input-jurnal-id-modifier").value = "";
        document.getElementById("form-jurnal-manual").reset();
        triggerGlobalSubsystemRefresh();
    };
});

function executeRenderBukuAkumulasiLedger() {
    const tbody = document.getElementById("table-ledger-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const activePeriod = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;
    const filterSubRentang = document.getElementById("filter-rentang-waktu-ledger").value;

    let consolidatedLedgerArray = [];
    let aggregatedDebit = 0;
    let aggregatedKredit = 0;

    const readTrxPromise = new Promise((resolve) => {
        accessObjectStore("store_transaksi").getAll().onsuccess = (ev) => {
            ev.target.result.filter(t => t.periode_filter === activePeriod).forEach(t => {
                consolidatedLedgerArray.push({
                    id_node: t.id, tanggal: t.tanggal, modul: "POS Terminal Jual",
                    deskripsi: `Penerimaan Omset Penjualan ${t.nama_model} (${t.size}) x${t.qty} via ${t.channel}`,
                    debit: t.total, kredit: 0, removable: false
                });
            });
            resolve();
        };
    });

    const readJurnalPromise = new Promise((resolve) => {
        accessObjectStore("store_jurnal_akuntansi").getAll().onsuccess = (ev) => {
            ev.target.result.filter(j => j.periode_filter === activePeriod).forEach(j => {
                const isDebit = j.tipe.includes("Masuk");
                consolidatedLedgerArray.push({
                    id_node: j.id, tanggal: j.tanggal, modul: "Kas Jurnal Umum",
                    deskripsi: j.keterangan,
                    debit: isDebit ? j.nominal : 0,
                    kredit: isDebit ? 0 : j.nominal,
                    removable: true
                });
            });
            resolve();
        };
    });

    const readAssetPromise = new Promise((resolve) => {
        accessObjectStore("store_inventaris").getAll().onsuccess = (ev) => {
            ev.target.result.filter(i => i.periode_filter === activePeriod).forEach(i => {
                let susutBln = i.total_nilai / i.masa_habis_pakai_bulan;
                consolidatedLedgerArray.push({
                    id_node: i.id_aset, tanggal: i.tanggal_beli, modul: "Aset & Penyusutan",
                    deskripsi: `Biaya Beban Penyusutan Aset Nilai Buku Bulanan: ${i.nama_alat}`,
                    debit: 0, kredit: Math.round(susutBln), removable: false
                });
            });
            resolve();
        };
    });

    const readRejectPromise = new Promise((resolve) => {
        accessObjectStore("store_retur_reject").getAll().onsuccess = (ev) => {
            ev.target.result.filter(r => r.periode_filter === activePeriod && r.jenis.includes("Cacat")).forEach(r => {
                consolidatedLedgerArray.push({
                    id_node: r.id, tanggal: r.tanggal, modul: "Retur/Kerugian",
                    deskripsi: `Kerugian Beban Barang Reject Cacat Produksi Model ${r.nama_model} (${r.size}) Qty ${r.qty}`,
                    debit: 0, kredit: 0, nominal_reject_info: "HPP Value Bound", removable: false
                });
            });
            resolve();
        };
    });

    Promise.all([readTrxPromise, readJurnalPromise, readAssetPromise, readRejectPromise]).then(() => {
        // Urutkan Kronologis Berdasarkan Timestamp Tanggal Maju
        consolidatedLedgerArray.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        // Penerapan Micro Filter Per Rentang Waktu Akuntansi
        const todayString = new Date().toISOString().split('T')[0];
        if (filterSubRentang === "hari") {
            consolidatedLedgerArray = consolidatedLedgerArray.filter(x => x.tanggal === todayString);
        } else if (filterSubRentang === "minggu") {
            const milestoneWeek = new Date();
            milestoneWeek.setDate(milestoneWeek.getDate() - 7);
            consolidatedLedgerArray = consolidatedLedgerArray.filter(x => new Date(x.tanggal) >= milestoneWeek);
        }

        consolidatedLedgerArray.forEach(row => {
            aggregatedDebit += row.debit;
            aggregatedKredit += row.kredit;

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/80 font-medium">
                    <td class="p-4 font-mono text-gray-500">${row.tanggal}</td>
                    <td class="p-4"><span class="text-xs font-black text-gray-400 uppercase tracking-wide">${row.modul}</span></td>
                    <td class="p-4 text-[#0F172A] font-bold">${row.deskripsi}</td>
                    <td class="p-4 text-emerald-700 font-mono font-black">${row.debit > 0 ? 'Rp ' + row.debit.toLocaleString() : '-'}</td>
                    <td class="p-4 text-rose-700 font-mono font-black">${row.kredit > 0 ? 'Rp ' + row.kredit.toLocaleString() : '-'}</td>
                    <td class="p-4 text-center">
                        ${row.removable ? `<button onclick="deleteJurnalKasManual(${row.id_node})" class="text-rose-700 hover:underline font-black">Hapus</button>` : `<span class="text-gray-300 font-normal">Sistem</span>`}
                    </td>
                </tr>
            `;
        });

        // Mutasi Nilai Balans Widget Komprehensif
        document.getElementById("widget-ledger-debit").innerText = `Rp ${aggregatedDebit.toLocaleString()}`;
        document.getElementById("widget-ledger-kredit").innerText = `Rp ${aggregatedKredit.toLocaleString()}`;
        
        let netProfitLoss = aggregatedDebit - aggregatedKredit;
        const netWidget = document.getElementById("widget-ledger-bersih");
        netWidget.innerText = `Rp ${netProfitLoss.toLocaleString()}`;
        netWidget.className = `text-2xl font-black font-mono ${netProfitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
    });
}

function deleteJurnalKasManual(id) {
    if (confirm("Hapus entri kas manual ini dari buku besar akumulasi finansial?")) {
        accessObjectStore("store_jurnal_akuntansi", "readwrite").delete(id).onsuccess = () => triggerGlobalSubsystemRefresh();
    }
}

function downloadPDFBukuAkumulasiFinansial() {
    alert("Proses Rendering Dokumen PDF Resmi Buku Besar Berjalan...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;
    
    doc.text(`CLOTHVERS GENERAL LEDGER JOURNAL - STATEMENT REPORT PERIOD (${period})`, 14, 15);
    
    const rows = [];
    document.querySelectorAll("#table-ledger-tbody tr").forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if(tds.length >= 5) {
            rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText, tds[4].innerText]);
        }
    });

    doc.autoTable({
        head: [['Tanggal', 'Subsistem Modul', 'Deskripsi Uraian Catatan', 'Debit (Masuk)', 'Kredit (Keluar)']],
        body: rows,
        startY: 22,
        headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save(`GENERAL_LEDGER_KONSOLIDASI_${period}.pdf`);
}

function downloadExcelCSVBukuAkumulasiFinansial() {
    const period = document.getElementById("global-filter-bulan").value + "-" + document.getElementById("global-filter-tahun").value;
    let csvDataPayload = "data:text/csv;charset=utf-8,Tanggal,Modul Asal,Deskripsi Uraian Catatan,Debit (Uang Masuk),Kredit (Uang Keluar)\n";
    
    const elementsRows = document.querySelectorAll("#table-ledger-tbody tr");
    if (elementsRows.length === 0) {
        alert("Gagal ekspor, matriks data buku besar periode ini kosong.");
        return;
    }
    
    elementsRows.forEach(tr => {
        const tdCells = tr.querySelectorAll("td");
        if (tdCells.length >= 5) {
            const compiledLine = `"${tdCells[0].innerText}","${tdCells[1].innerText}","${tdCells[2].innerText}","${tdCells[3].innerText}","${tdCells[4].innerText}"`;
            csvDataPayload += compiledLine + "\n";
        }
    });

    const triggerUri = encodeURI(csvDataPayload);
    const virtualLink = document.createElement("a");
    virtualLink.setAttribute("href", triggerUri);
    virtualLink.setAttribute("download", `FINANCIAL_LEDGER_CLOTHVERS_${period}.csv`);
    document.body.appendChild(virtualLink);
    virtualLink.click();
    document.body.removeChild(virtualLink);
}

// -------------------------------------------------------------------------
// MODUL G: BACKUP & SYNC BRIDGE ENGINE (JSON COMPATIBILITY)
// -------------------------------------------------------------------------
function executeDatabaseBackupToJSON() {
    const fullBackupContainer = {};
    const objectStoreList = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject", "store_inventaris"];
    let processedStoresCounter = 0;

    objectStoreList.forEach(sName => {
        accessObjectStore(sName).getAll().onsuccess = (event) => {
            fullBackupContainer[sName] = event.target.result;
            processedStoresCounter++;
            
            if (processedStoresCounter === objectStoreList.length) {
                const convertedBlob = new Blob([JSON.stringify(fullBackupContainer, null, 2)], { type: "application/json" });
                const transientUrl = URL.createObjectURL(convertedBlob);
                const downloadAnchor = document.createElement("a");
                downloadAnchor.href = transientUrl;
                downloadAnchor.download = `CLOTHVERS_CORE_DB_SYNC_${new Date().toISOString().split('T')[0]}.json`;
                downloadAnchor.click();
                URL.revokeObjectURL(transientUrl);
            }
        };
    });
}

function executeDatabaseRestoreFromJSON(event) {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        try {
            const parsedDatabaseObj = JSON.parse(e.target.result);
            const discoveredStores = Object.keys(parsedDatabaseObj);
            let injectionSuccessCounter = 0;

            discoveredStores.forEach(sName => {
                const transactionalWriteNode = dbInstance.transaction(sName, "readwrite");
                const currentStoreRef = transactionalWriteNode.objectStore(sName);
                
                currentStoreRef.clear(); // Wipe out local conflict data node anomalies
                parsedDatabaseObj[sName].forEach(item => {
                    currentStoreRef.add(item);
                });

                transactionalWriteNode.oncomplete = () => {
                    injectionSuccessCounter++;
                    if (injectionSuccessCounter === discoveredStores.length) {
                        alert("Sinkronisasi Sukses! Seluruh data dari perangkat luar telah di-restore ke IndexedDB lokal secara sempurna.");
                        triggerGlobalSubsystemRefresh();
                    }
                };
            });
        } catch (err) {
            alert("Kritis Error: Format file backup data JSON rusak atau bukan merupakan manifest skema Clothvers DB.");
        }
    };
    fileReader.readAsText(selectedFile);
}
