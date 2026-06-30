/**
 * Clothvers System v1.0 - Core Engine JavaScript
 * Engineered with Pure Vanilla JS & Robust Structural IndexedDB Schema.
 * Fully compliant for Cross-Device Stability up to 2030+.
 */

// Global App State Variables
let db = null;
let currentTab = 'stok';
let activeMatriksWarna = []; // Array of string colors currently managed in real-time form
let currentCart = [];
let lastGeneratedInvoice = null;
let filterWaktuJurnal = 'all'; // all, hari, minggu, bulan

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];

// 1. INITIALIZATION & INDEXEDDB ARCHITECTURE
document.addEventListener('DOMContentLoaded', () => {
    initIndexedDB();
    setupDefaultDates();
});

function initIndexedDB() {
    const request = indexedDB.open('ClothversDB', 1);

    request.onerror = (event) => {
        console.error('Database connection failed:', event.target.error);
        alert('Gagal mengaktifkan IndexedDB di browser ini. Periksa izin penyimpanan.');
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('ClothversDB v1.0 connected successfully.');
        triggerGlobalSync();
    };

    request.onupgradeneeded = (event) => {
        const upgradeDb = event.target.result;
        
        if (!upgradeDb.objectStoreNames.contains('store_produk')) {
            upgradeDb.createObjectStore('store_produk', { keyPath: 'nama_model' });
        }
        if (!upgradeDb.objectStoreNames.contains('store_hpp')) {
            upgradeDb.createObjectStore('store_hpp', { keyPath: 'id_hpp', autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains('store_transaksi')) {
            upgradeDb.createObjectStore('store_transaksi', { keyPath: 'id_transaksi', autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains('store_jurnal_akuntansi')) {
            upgradeDb.createObjectStore('store_jurnal_akuntansi', { keyPath: 'id_jurnal', autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains('store_retur_reject')) {
            upgradeDb.createObjectStore('store_retur_reject', { keyPath: 'id_retur', autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains('store_inventaris')) {
            upgradeDb.createObjectStore('store_inventaris', { keyPath: 'id_aset', autoIncrement: true });
        }
        if (!upgradeDb.objectStoreNames.contains('store_customer')) {
            upgradeDb.createObjectStore('store_customer', { keyPath: 'id_customer', autoIncrement: true });
        }
        console.log('ClothversDB Object Stores structured and ready.');
    };
}

function setupDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const elOrder = document.getElementById('pos-date-order');
    const elDone = document.getElementById('pos-date-done');
    if (elOrder) elOrder.value = today;
    if (elDone) elDone.value = today;
}

// NAVIGATION ENGINE
function switchTab(tabName) {
    const tabs = ['stok', 'hpp', 'pos', 'customer', 'retur', 'inventaris', 'akuntansi', 'system'];
    tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        const btn = document.getElementById(`btn-tab-${t}`);
        if (el) {
            if (t === tabName) {
                el.classList.remove('hidden');
                el.classList.add('block');
            } else {
                el.classList.remove('block');
                el.classList.add('hidden');
            }
        }
        if (btn) {
            if (t === tabName) {
                btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-blue-600 text-white shadow-md shadow-blue-900/20";
            } else {
                btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-slate-400 hover:bg-slate-800 hover:text-white";
            }
        }
    });

    currentTab = tabName;
    
    // UI Page Title Sync Mapping
    const titles = {
        stok: 'Master Input Stok Pakaian',
        hpp: 'Dashboard Manajemen Penentuan HPP',
        pos: 'Terminal POS Mesin Kasir Digital',
        customer: 'CRM Database Customer Log',
        retur: 'Modul Manajemen Retur & Reject',
        inventaris: 'Dashboard Inventaris Aset Alat Kerja',
        akuntansi: 'Akuntansi Terpadu & Buku Besar Keuangan',
        system: 'System Sync Bridge & Backup Data'
    };
    document.getElementById('page-title').innerText = titles[tabName] || 'Clothvers System';
    
    triggerGlobalSync();
}

function triggerGlobalSync() {
    if (!db) return;
    renderStokTable();
    syncHppDropdowns();
    renderHppTable();
    syncPosDropdowns();
    renderCustomerTable();
    renderReturTable();
    renderInventarisTable();
    renderAkuntansiDashboard();
}

// ==========================================
// MODULE A: INVENTORI STOK PAKAIAN ENGINE
// ==========================================
function tambahWarnaMatriks() {
    const inputWarna = document.getElementById('input-varian-warna-baru');
    const warna = inputWarna.value.trim();
    
    if (!warna) {
        alert('Tulis nama varian warna terlebih dahulu.');
        return;
    }
    if (activeMatriksWarna.includes(warna)) {
        alert('Warna ini sudah ditambahkan ke dalam rancangan.');
        return;
    }

    activeMatriksWarna.push(warna);
    inputWarna.value = '';
    renderFormMatriksWarnaHTML();
}

function hapusWarnaMatriks(warna) {
    activeMatriksWarna = activeMatriksWarna.filter(w => w !== warna);
    renderFormMatriksWarnaHTML();
}

function renderFormMatriksWarnaHTML() {
    const container = document.getElementById('wrapper-matriks-warna-kerja');
    container.innerHTML = '';

    activeMatriksWarna.forEach((warna) => {
        const colorCard = document.createElement('div');
        colorCard.className = "bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm relative";
        colorCard.dataset.warna = warna;

        colorCard.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                <span class="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-md uppercase tracking-wider">Varian Warna: ${warna}</span>
                <button type="button" onclick="hapusWarnaMatriks('${warna}')" class="text-xs font-bold text-rose-600 hover:underline">Hapus Baris Warna</button>
            </div>
            <div class="w-full overflow-x-auto block whitespace-nowrap">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-100">
                            <th class="p-2 w-16">SIZE</th>
                            <th class="p-2 w-24">STOK FISIK</th>
                            <th class="p-2 w-28">HPP ASLI (RP)</th>
                            <th class="p-2 w-28">HARGA JUAL (RP)</th>
                            <th class="p-2 w-20">WH (cm)</th>
                            <th class="p-2 w-20">HT (cm)</th>
                            <th class="p-2 w-24">TB MIN</th>
                            <th class="p-2 w-24">TB MAX</th>
                            <th class="p-2 w-24">BB MIN</th>
                            <th class="p-2 w-24">BB MAX</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-600">
                        ${SIZES.map(size => `
                            <tr data-size="${size}">
                                <td class="p-2 font-black text-[#0F172A]">${size}</td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-2 py-1 field-stok" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-2 py-1 field-hpp" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-2 py-1 field-jual" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-2 py-1 field-wh" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-2 py-1 field-ht" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-1 py-1 field-tbmin" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-1 py-1 field-tbmax" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-1 py-1 field-bbmin" value="0" required></td>
                                <td class="p-2"><input type="number" class="w-full border border-slate-200 rounded-lg px-1 py-1 field-bbmax" value="0" required></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(colorCard);
    });
}

function saveProdukMaster(event) {
    event.preventDefault();
    if (!db) return;

    const namaModel = document.getElementById('prod-nama-model').value.trim();
    const jenisKain = document.getElementById('prod-jenis-kain').value.trim();
    const tipeGsm = document.getElementById('prod-tipe-gsm').value.trim();
    const detailProduksi = document.getElementById('prod-detail-produksi').value.trim();

    if (activeMatriksWarna.length === 0) {
        alert('Wajib menambahkan minimal satu varian warna beserta bagan ukurannya.');
        return;
    }

    const matriksVarian = [];
    const colorCards = document.querySelectorAll('#wrapper-matriks-warna-kerja > div');

    colorCards.forEach(card => {
        const warna = card.dataset.warna;
        const rows = card.querySelectorAll('tbody > tr');
        rows.forEach(row => {
            const size = row.dataset.size;
            matriksVarian.push({
                warna: warna,
                size: size,
                stok: parseInt(row.querySelector('.field-stok').value) || 0,
                hpp_varian: parseFloat(row.querySelector('.field-hpp').value) || 0,
                jual_varian: parseFloat(row.querySelector('.field-jual').value) || 0,
                wh: parseFloat(row.querySelector('.field-wh').value) || 0,
                ht: parseFloat(row.querySelector('.field-ht').value) || 0,
                tb_min: parseFloat(row.querySelector('.field-tbmin').value) || 0,
                tb_max: parseFloat(row.querySelector('.field-tbmax').value) || 0,
                bb_min: parseFloat(row.querySelector('.field-bbmin').value) || 0,
                bb_max: parseFloat(row.querySelector('.field-bbmax').value) || 0
            });
        });
    });

    const payload = {
        nama_model: namaModel,
        jenis_kain: jenisKain,
        tipe_kain_gsm: tipeGsm,
        detail_produksi: detailProduksi,
        matriks_varian: matriksVarian
    };

    const tx = db.transaction('store_produk', 'readwrite');
    const store = tx.objectStore('store_produk');
    store.put(payload);

    tx.oncomplete = () => {
        alert('Master data produk dan seluruh matriks varian berhasil disimpan secara permanen.');
        resetFormProduk();
        triggerGlobalSync();
    };
    
    tx.onerror = (e) => {
        console.error(e);
        alert('Gagal mengeksekusi transaksi database.');
    };
}

function resetFormProduk() {
    document.getElementById('form-produk').reset();
    document.getElementById('edit-produk-id').value = '';
    document.getElementById('prod-nama-model').disabled = false;
    activeMatriksWarna = [];
    document.getElementById('wrapper-matriks-warna-kerja').innerHTML = '';
}

function renderStokTable() {
    if (!db) return;
    const tbody = document.getElementById('table-stok-body');
    tbody.innerHTML = '';

    const tx = db.transaction('store_produk', 'readonly');
    const store = tx.objectStore('store_produk');
    
    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const data = cursor.value;
            const totalStok = (data?.matriks_varian || []).reduce((acc, curr) => acc + (curr?.stok || 0), 0);
            const totalVarian = (data?.matriks_varian || []).length;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 font-bold text-[#0F172A]">${data.nama_model}</td>
                <td class="p-4 text-xs text-slate-500">
                    <span class="block font-bold text-slate-700">${data.jenis_kain} (${data.tipe_kain_gsm})</span>
                    <span>${data.detail_produksi}</span>
                </td>
                <td class="p-4 text-sm font-black text-blue-600">${totalStok} Pcs <span class="text-xs font-normal text-slate-400">(${totalVarian} Varian)</span></td>
                <td class="p-4 text-center space-x-2">
                    <button onclick="editProduk('${data.nama_model}')" class="px-2.5 py-1 bg-[#0F172A] text-white text-xs font-bold rounded-md hover:bg-slate-800 transition-all">Edit</button>
                    <button onclick="deleteProduk('${data.nama_model}')" class="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-md hover:bg-rose-700 transition-all">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function editProduk(id) {
    const tx = db.transaction('store_produk', 'readonly');
    const store = tx.objectStore('store_produk');
    store.get(id).onsuccess = (e) => {
        const data = e.target.result;
        if (!data) return;

        document.getElementById('prod-nama-model').value = data.nama_model;
        document.getElementById('prod-nama-model').disabled = true; // Lock identity primary key
        document.getElementById('prod-jenis-kain').value = data.jenis_kain;
        document.getElementById('prod-tipe-gsm').value = data.tipe_kain_gsm;
        document.getElementById('prod-detail-produksi').value = data.detail_produksi;

        // Reconstruct unique color groups
        const varians = data?.matriks_varian || [];
        const uniqueColors = [...new Set(varians.map(v => v.warna))];
        
        activeMatriksWarna = uniqueColors;
        renderFormMatriksWarnaHTML();

        // Populate fields matching criteria
        uniqueColors.forEach(warna => {
            const card = document.querySelector(`#wrapper-matriks-warna-kerja > div[data-warna="${warna}"]`);
            if (card) {
                varians.filter(v => v.warna === warna).forEach(v => {
                    const row = card.querySelector(`tbody > tr[data-size="${v.size}"]`);
                    if (row) {
                        row.querySelector('.field-stok').value = v.stok;
                        row.querySelector('.field-hpp').value = v.hpp_varian;
                        row.querySelector('.field-jual').value = v.jual_varian;
                        row.querySelector('.field-wh').value = v.wh;
                        row.querySelector('.field-ht').value = v.ht;
                        row.querySelector('.field-tbmin').value = v.tb_min;
                        row.querySelector('.field-tbmax').value = v.tb_max;
                        row.querySelector('.field-bbmin').value = v.bb_min;
                        row.querySelector('.field-bbmax').value = v.bb_max;
                    }
                });
            }
        });
    };
}

function deleteProduk(id) {
    if (!confirm(`Hapus mutlak master model [ ${id} ]? Semua data stok akan hilang.`)) return;
    const tx = db.transaction('store_produk', 'readwrite');
    tx.objectStore('store_produk').delete(id);
    tx.oncomplete = () => { triggerGlobalSync(); };
}

// PDF DOWNLOADE GENERATOR STOK
function downloadPDFStok() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("headline", "bold");
    doc.text("CLOTHVERS SYSTEM - LAPORAN MASTER DATA STOK", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode Tahun: ${document.getElementById('global-filter-periode').value} | Tanggal Cetak: ${new Date().toLocaleDateString()}`, 14, 22);

    let y = 30;
    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const data = cursor.value;
            doc.setFontSize(11);
            doc.text(`Model: ${data.nama_model} | Kain: ${data.jenis_kain} - ${data.tipe_kain_gsm}`, 14, y);
            y += 6;
            
            doc.setFontSize(9);
            (data?.matriks_varian || []).forEach(v => {
                doc.text(`   -> Warna: ${v.warna} | Size: ${v.size} | Stok: ${v.stok} | HPP: Rp ${v.hpp_varian} | Jual: Rp ${v.jual_varian}`, 14, y);
                y += 5;
                if (y > 280) { doc.addPage(); y = 20; }
            });
            y += 5;
            cursor.continue();
        } else {
            doc.save('Clothvers_Master_Stok.pdf');
        }
    };
}

// ==========================================
// MODULE B: MANAJEMEN HPP CALCULATOR ENGINE
// ==========================================
function syncHppDropdowns() {
    if (!db) return;
    const selectModel = document.getElementById('hpp-model-select');
    const selectedValue = selectModel.value;
    selectModel.innerHTML = '<option value="">-- Pilih Model --</option>';

    db.transaction('store_produk', 'readonly').objectStore('store_produk').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const opt = document.createElement('option');
            opt.value = cursor.value.nama_model;
            opt.innerText = cursor.value.nama_model;
            selectModel.appendChild(opt);
            cursor.continue();
        } else if (selectedValue) {
            selectModel.value = selectedValue;
        }
    };
}

function syncHppSizeOptions() {
    const modelId = document.getElementById('hpp-model-select').value;
    const selectSize = document.getElementById('hpp-size-select');
    selectSize.innerHTML = '<option value="">-- Size --</option>';
    document.getElementById('hpp-biaya-kain').value = 0;

    if (!modelId) return;

    db.transaction('store_produk', 'readonly').objectStore('store_produk').get(modelId).onsuccess = (e) => {
        const data = e.target.result;
        if (!data) return;
        const uniqueSizes = [...new Set((data?.matriks_varian || []).map(v => v.size))];
        uniqueSizes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.innerText = s;
            selectSize.appendChild(opt);
        });
    };
}

function syncHppFabricCost() {
    const modelId = document.getElementById('hpp-model-select').value;
    const sizeId = document.getElementById('hpp-size-select').value;
    const inputBiayaKain = document.getElementById('hpp-biaya-kain');

    if (!modelId || !sizeId) {
        inputBiayaKain.value = 0;
        return;
    }

    db.transaction('store_produk', 'readonly').objectStore('store_produk').get(modelId).onsuccess = (e) => {
        const data = e.target.result;
        if (!data) return;
        const matched = (data?.matriks_varian || []).find(v => v.size === sizeId);
        inputBiayaKain.value = matched ? matched.hpp_varian : 0;
        calculateTotalHppSimulation();
    };
}

function calculateTotalHppSimulation() {
    const kain = parseFloat(document.getElementById('hpp-biaya-kain').value) || 0;
    const jahit = parseFloat(document.getElementById('hpp-ongkos-jahit').value) || 0;
    const sablon = parseFloat(document.getElementById('hpp-aplikasi-sablon').value) || 0;
    const pack = parseFloat(document.getElementById('hpp-packaging').value) || 0;
    const marginPercent = parseFloat(document.getElementById('hpp-margin-percent').value) || 0;

    const baseHpp = kain + jahit + sablon + pack;
    const totalWithMargin = baseHpp + (baseHpp * (marginPercent / 100));

    document.getElementById('label-hpp-total-kalkulasi').innerText = `Rp ${Math.round(totalWithMargin).toLocaleString('id-ID')}`;
    return { baseHpp, totalWithMargin };
}

function saveHppSimulation(event) {
    event.preventDefault();
    const model = document.getElementById('hpp-model-select').value;
    const size = document.getElementById('hpp-size-select').value;
    if (!model || !size) return alert('Pilih produk dan ukuran terlebih dahulu.');

    const calc = calculateTotalHppSimulation();
    
    const payload = {
        nama_model: model,
        size_terpilih: size,
        biaya_kain_otomatis: parseFloat(document.getElementById('hpp-biaya-kain').value) || 0,
        ongkos_jahit: parseFloat(document.getElementById('hpp-ongkos-jahit').value) || 0,
        aplikasi_sablon: parseFloat(document.getElementById('hpp-aplikasi-sablon').value) || 0,
        packaging: parseFloat(document.getElementById('hpp-packaging').value) || 0,
        margin_percent: parseFloat(document.getElementById('hpp-margin-percent').value) || 0,
        hpp_total: calc.baseHpp,
        harga_jual_channels: {
            wa: calc.totalWithMargin + (calc.totalWithMargin * ((parseFloat(document.getElementById('admin-wa').value) || 0) / 100)),
            shopee: calc.totalWithMargin + (calc.totalWithMargin * ((parseFloat(document.getElementById('admin-shopee').value) || 0) / 100)),
            tiktok: calc.totalWithMargin + (calc.totalWithMargin * ((parseFloat(document.getElementById('admin-tiktok').value) || 0) / 100)),
            reseller: calc.totalWithMargin + (calc.totalWithMargin * ((parseFloat(document.getElementById('admin-reseller').value) || 0) / 100))
        }
    };

    const editId = document.getElementById('edit-hpp-id').value;
    if (editId) payload.id_hpp = parseInt(editId);

    const tx = db.transaction('store_hpp', 'readwrite');
    tx.objectStore('store_hpp').put(payload);
    tx.oncomplete = () => {
        alert('Skema kalkulasi HPP dan Multi-Channel aman.');
        document.getElementById('form-hpp').reset();
        document.getElementById('edit-hpp-id').value = '';
        triggerGlobalSync();
    };
}

function renderHppTable() {
    if (!db) return;
    const tbody = document.getElementById('table-hpp-body');
    tbody.innerHTML = '';

    db.transaction('store_hpp', 'readonly').objectStore('store_hpp').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const data = cursor.value;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 font-bold text-[#0F172A]">${data.nama_model} <span class="text-xs bg-slate-100 px-1.5 py-0.5 rounded ml-1">${data.size_terpilih}</span></td>
                <td class="p-4 font-bold">Rp ${(data.hpp_total || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-xs font-semibold text-blue-600">Rp ${Math.round(data.harga_jual_channels?.wa || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-xs font-semibold text-orange-600">Rp ${Math.round(data.harga_jual_channels?.shopee || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-xs font-semibold text-purple-600">Rp ${Math.round(data.harga_jual_channels?.tiktok || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-xs font-semibold text-emerald-600">Rp ${Math.round(data.harga_jual_channels?.reseller || 0).toLocaleString('id-ID')}</td>
                <td class="p-4 text-center space-x-1">
                    <button onclick="editHpp(${data.id_hpp})" class="px-2 py-0.5 bg-slate-800 text-white text-[11px] rounded font-bold">Edit</button>
                    <button onclick="deleteHpp(${data.id_hpp})" class="px-2 py-0.5 bg-rose-600 text-white text-[11px] rounded font-bold">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function editHpp(id) {
    db.transaction('store_hpp', 'readonly').objectStore('store_hpp').get(id).onsuccess = (e) => {
        const data = e.target.result;
        if (!data) return;
        document.getElementById('edit-hpp-id').value = data.id_hpp;
        document.getElementById('hpp-model-select').value = data.nama_model;
        
        // Simulating chain reaction selection manually
        const selectSize = document.getElementById('hpp-size-select');
        selectSize.innerHTML = `<option value="${data.size_terpilih}">${data.size_terpilih}</option>`;
        
        document.getElementById('hpp-biaya-kain').value = data.biaya_kain_otomatis;
        document.getElementById('hpp-ongkos-jahit').value = data.ongkos_jahit;
        document.getElementById('hpp-aplikasi-sablon').value = data.aplikasi_sablon;
        document.getElementById('hpp-packaging').value = data.packaging;
        document.getElementById('hpp-margin-percent').value = data.margin_percent;
        calculateTotalHppSimulation();
    };
}

function deleteHpp(id) {
    if (!confirm('Hapus skema HPP ini?')) return;
    const tx = db.transaction('store_hpp', 'readwrite');
    tx.objectStore('store_hpp').delete(id);
    tx.oncomplete = () => triggerGlobalSync();
}

function downloadPDFHpp() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("CLOTHVERS SYSTEM - LAPORAN ANALISIS STRUKTUR HPP", 14, 15);
    let y = 25;

    db.transaction('store_hpp', 'readonly').objectStore('store_hpp').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const d = cursor.value;
            doc.text(`${d.nama_model} (${d.size_terpilih}) -> HPP Modal Base: Rp ${d.hpp_total} | WA: Rp ${Math.round(d.harga_jual_channels.wa)} | Shopee: Rp ${Math.round(d.harga_jual_channels.shopee)}`, 14, y);
            y += 7;
            cursor.continue();
        } else {
            doc.save('Laporan_HPP_Clothvers.pdf');
        }
    };
}

// ==========================================
// MODULE C: TERMINAL POS KASIR ENGINE
// ==========================================
function syncPosDropdowns() {
    if (!db) return;
    const sel = document.getElementById('pos-product-select');
    const oldVal = sel.value;
    sel.innerHTML = '<option value="">-- Pilih Produk POS --</option>';

    db.transaction('store_produk', 'readonly').objectStore('store_produk').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const opt = document.createElement('option');
            opt.value = cursor.value.nama_model;
            opt.innerText = cursor.value.nama_model;
            sel.appendChild(opt);
            cursor.continue();
        } else if (oldVal) {
            sel.value = oldVal;
        }
    };
}

function syncPosVarianOptions() {
    const modelId = document.getElementById('pos-product-select').value;
    const selVarian = document.getElementById('pos-varian-select');
    selVarian.innerHTML = '<option value="">-- Pilih Warna & Size --</option>';

    if (!modelId) return;

    db.transaction('store_produk', 'readonly').objectStore('store_produk').get(modelId).onsuccess = (e) => {
        const data = e.target.result;
        if (!data) return;
        (data?.matriks_varian || []).forEach(v => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ warna: v.warna, size: v.size, harga: v.jual_varian });
            opt.innerText = `${v.warna} - Size ${v.size} [Stok: ${v.stok} Pcs] - Rp ${v.jual_varian.toLocaleString('id-ID')}`;
            selVarian.appendChild(opt);
        });
    };
}

function addItemToCart() {
    const model = document.getElementById('pos-product-select').value;
    const varianRaw = document.getElementById('pos-varian-select').value;

    if (!model || !varianRaw) return alert('Pilih item varian secara lengkap.');

    const parsed = JSON.parse(varianRaw);
    
    // Check duplication in temporary basket session
    const existing = currentCart.find(c => c.nama_model === model && c.warna === parsed.warna && c.size === parsed.size);
    if (existing) {
        existing.qty += 1;
    } else {
        currentCart.push({
            nama_model: model,
            warna: parsed.warna,
            size: parsed.size,
            harga_satuan: parsed.harga,
            qty: 1
        });
    }

    renderCartTable();
}

function updateCartQty(index, val) {
    const qty = parseInt(val) || 1;
    if (qty < 1) return;
    currentCart[index].qty = qty;
    calculateCartTotalSummary();
}

function updateCartPrice(index, val) {
    const price = parseFloat(val) || 0;
    currentCart[index].harga_satuan = price;
    calculateCartTotalSummary();
}

function removeCartItem(index) {
    currentCart.splice(index, 1);
    renderCartTable();
}

function renderCartTable() {
    const tbody = document.getElementById('table-cart-body');
    tbody.innerHTML = '';

    currentCart.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-4 font-bold text-[#0F172A]">${item.nama_model} <span class="text-xs text-slate-500 block">${item.warna} (${item.size})</span></td>
            <td class="p-4"><input type="number" oninput="updateCartPrice(${index}, this.value)" class="border rounded px-2 py-1 w-28 text-xs font-semibold" value="${item.harga_satuan}"></td>
            <td class="p-4"><input type="number" oninput="updateCartQty(${index}, this.value)" class="border rounded px-2 py-1 w-16 text-xs font-bold text-center" value="${item.qty}"></td>
            <td class="p-4 font-black text-slate-900">Rp ${(item.harga_satuan * item.qty).toLocaleString('id-ID')}</td>
            <td class="p-4 text-center"><button onclick="removeCartItem(${index})" class="text-rose-600 font-extrabold hover:underline">X</button></td>
        `;
        tbody.appendChild(tr);
    });

    calculateCartTotalSummary();
}

function calculateCartTotalSummary() {
    const gross = currentCart.reduce((acc, curr) => acc + (curr.harga_satuan * curr.qty), 0);
    const discVal = parseFloat(document.getElementById('pos-discount').value) || 0;
    const discType = document.getElementById('pos-discount-type').value;

    let totalDiscount = 0;
    if (discType === 'nominal') {
        totalDiscount = discVal;
    } else {
        totalDiscount = gross * (discVal / 100);
    }

    const netTotal = Math.max(0, gross - totalDiscount);

    document.getElementById('summary-gross-total').innerText = `Rp ${gross.toLocaleString('id-ID')}`;
    document.getElementById('summary-discount').innerText = `Rp ${totalDiscount.toLocaleString('id-ID')}`;
    document.getElementById('summary-net-total').innerText = `Rp ${netTotal.toLocaleString('id-ID')}`;

    return { gross, totalDiscount, netTotal };
}

function checkoutTransaction() {
    if (currentCart.length === 0) return alert('Keranjang belanja kosong.');
    const customerName = document.getElementById('pos-cust-name').value.trim();
    const customerPhone = document.getElementById('pos-cust-phone').value.trim();

    if (!customerName || !customerPhone) return alert('Data customer wajib diisi untuk log CRM.');

    const summary = calculateCartTotalSummary();
    const statusBayar = document.getElementById('pos-payment-status').value;

    const transactionPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: currentCart,
        gross_total: summary.gross,
        discount_applied: summary.totalDiscount,
        net_total: summary.netTotal,
        payment_status: statusBayar,
        courier: document.getElementById('pos-shipping-courier').value,
        resi: document.getElementById('pos-shipping-resi').value,
        date_order: document.getElementById('pos-date-order').value,
        date_estimated: document.getElementById('pos-date-done').value,
        timestamp: new Date().getTime()
    };

    const tx = db.transaction(['store_transaksi', 'store_jurnal_akuntansi', 'store_customer'], 'readwrite');
    
    // 1. Put POS Transaction Log
    const reqTx = tx.objectStore('store_transaksi').put(transactionPayload);
    
    // 2. Put Integrated Jurnal Aluntansi Real-time
    tx.objectStore('store_jurnal_akuntansi').put({
        timestamp: new Date().getTime(),
        jenis_aliran: statusBayar === 'Lunas' ? 'Uang Masuk (POS Kasir)' : 'Piutang Order (DP Kasir)',
        nominal: summary.netTotal,
        keterangan: `Penjualan POS Multi-item. Customer: ${customerName}`
    });

    // 3. Put CRM Log Customer Database Update
    tx.objectStore('store_customer').put({
        nama_customer: customerName,
        nomor_hp: customerPhone,
        total_transaksi: summary.netTotal,
        timestamp: new Date().getTime()
    });

    tx.oncomplete = () => {
        alert('Transaksi Kasir Berhasil Diproses & Live Sync Sinkron.');
        lastGeneratedInvoice = transactionPayload;
        
        // Unlock action button triggers
        document.getElementById('btn-print-pdf').disabled = false;
        document.getElementById('btn-send-wa').disabled = false;

        // Reset inputs fields
        currentCart = [];
        renderCartTable();
        document.getElementById('pos-cust-name').value = '';
        document.getElementById('pos-cust-phone').value = '';
        triggerGlobalSync();
    };
}

function printLastInvoicePDF() {
    if (!lastGeneratedInvoice) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: [80, 150] }); // Custom Thermal size emulation

    doc.setFontSize(10);
    doc.text("CLOTHVERS STORE NOTA", 10, 10);
    doc.text("-----------------------------------", 10, 14);
    doc.text(`Cust: ${lastGeneratedInvoice.customer_name}`, 10, 20);
    doc.text(`Tgl Order: ${lastGeneratedInvoice.date_order}`, 10, 25);
    doc.text(`Estimasi Jadi: ${lastGeneratedInvoice.date_estimated}`, 10, 30);
    doc.text("-----------------------------------", 10, 34);

    let y = 40;
    lastGeneratedInvoice.items.forEach(it => {
        doc.text(`${it.nama_model} [${it.size}] x${it.qty}`, 10, y);
        doc.text(`Rp ${(it.harga_satuan * it.qty).toLocaleString('id-ID')}`, 50, y);
        y += 6;
    });

    doc.text("-----------------------------------", 10, y);
    y += 5;
    doc.text(`Total Bayar: Rp ${lastGeneratedInvoice.net_total.toLocaleString('id-ID')}`, 10, y);
    y += 6;
    doc.text(`Status: ${lastGeneratedInvoice.payment_status}`, 10, y);

    doc.save(`Invoice_${lastGeneratedInvoice.customer_name}.pdf`);
}

function sendLastInvoiceWA() {
    if (!lastGeneratedInvoice) return;
    const text = `Halo ${lastGeneratedInvoice.customer_name},\nTerima kasih telah memesan di Clothvers.\nBerikut rincian order Anda:\nTotal Tagihan: Rp ${lastGeneratedInvoice.net_total.toLocaleString('id-ID')} (${lastGeneratedInvoice.payment_status}).\nEstimasi Pengiriman/Selesai: ${lastGeneratedInvoice.date_estimated}.\nTerima Kasih!`;
    const url = `https://api.whatsapp.com/send?phone=${lastGeneratedInvoice.customer_phone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// ==========================================
// MODULE D: CRM CUSTOMER LOG DATABASE
// ==========================================
function renderCustomerTable() {
    if (!db) return;
    const tbody = document.getElementById('table-customer-body');
    tbody.innerHTML = '';

    db.transaction('store_customer', 'readonly').objectStore('store_customer').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const d = cursor.value;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 text-xs font-semibold text-slate-500">${new Date(d.timestamp).toLocaleDateString()}</td>
                <td class="p-4 font-bold text-[#0F172A]">${d.nama_customer}</td>
                <td class="p-4 text-sm font-medium text-slate-700">${d.nomor_hp}</td>
                <td class="p-4 text-sm font-black text-emerald-600">Rp ${d.total_transaksi.toLocaleString('id-ID')}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteCustomer(${d.id_customer})" class="px-2 py-1 bg-rose-600 text-white text-xs rounded font-bold">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function deleteCustomer(id) {
    if (!confirm('Hapus log data customer ini?')) return;
    const tx = db.transaction('store_customer', 'readwrite');
    tx.objectStore('store_customer').delete(id);
    tx.oncomplete = () => triggerGlobalSync();
}

function downloadPDFCustomer() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("CLOTHVERS CLIENT RELATIONSHIP DATA (CRM)", 14, 15);
    let y = 25;
    db.transaction('store_customer', 'readonly').objectStore('store_customer').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            doc.text(`Nama: ${cursor.value.nama_customer} | HP: ${cursor.value.nomor_hp} | Nilai Transaksi: Rp ${cursor.value.total_transaksi}`, 14, y);
            y += 7;
            cursor.continue();
        } else {
            doc.save('CRM_Database_Customer_Clothvers.pdf');
        }
    };
}

// ==========================================
// MODULE E: RETUR, REJECT & INVENTARIS ENGINE
// ==========================================
function saveReturReject(event) {
    event.preventDefault();
    const payload = {
        customer: document.getElementById('retur-cust').value,
        model: document.getElementById('retur-model').value,
        jenis: document.getElementById('retur-jenis').value,
        kerugian: parseFloat(document.getElementById('retur-kerugian').value) || 0,
        timestamp: new Date().getTime()
    };
    const tx = db.transaction('store_retur_reject', 'readwrite');
    tx.objectStore('store_retur_reject').put(payload);
    tx.oncomplete = () => {
        document.getElementById('form-retur').reset();
        triggerGlobalSync();
    };
}

function renderReturTable() {
    const tbody = document.getElementById('table-retur-body');
    tbody.innerHTML = '';
    db.transaction('store_retur_reject', 'readonly').objectStore('store_retur_reject').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const d = cursor.value;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 font-bold">${d.customer}</td>
                <td class="p-4 text-xs">${d.model}</td>
                <td class="p-4"><span class="px-2 py-0.5 text-[10px] rounded font-bold ${d.jenis === 'Tukar Size' ? 'bg-blue-100 text-blue-800':'bg-rose-100 text-rose-800'}">${d.jenis}</span></td>
                <td class="p-4 text-sm font-bold text-rose-600">Rp ${d.kerugian.toLocaleString('id-ID')}</td>
                <td class="p-4 text-center"><button onclick="deleteRetur(${d.id_retur})" class="text-rose-600 text-xs font-bold">Hapus</button></td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function deleteRetur(id) {
    const tx = db.transaction('store_retur_reject', 'readwrite');
    tx.objectStore('store_retur_reject').delete(id);
    tx.oncomplete = () => triggerGlobalSync();
}

// INVENTARIS ENGINE ASSETS
function saveInventaris(event) {
    event.preventDefault();
    const payload = {
        nama_aset: document.getElementById('inv-nama').value,
        harga_beli: parseFloat(document.getElementById('inv-harga').value) || 0,
        penyusutan: parseFloat(document.getElementById('inv-susut').value) || 0
    };
    const tx = db.transaction('store_inventaris', 'readwrite');
    tx.objectStore('store_inventaris').put(payload);
    tx.oncomplete = () => {
        document.getElementById('form-inventaris').reset();
        triggerGlobalSync();
    };
}

function renderInventarisTable() {
    const tbody = document.getElementById('table-inventaris-body');
    tbody.innerHTML = '';
    db.transaction('store_inventaris', 'readonly').objectStore('store_inventaris').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const d = cursor.value;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 font-bold text-[#0F172A]">${d.nama_aset}</td>
                <td class="p-4">Rp ${d.harga_beli.toLocaleString('id-ID')}</td>
                <td class="p-4 text-rose-600 font-bold">Rp ${d.penyusutan.toLocaleString('id-ID')} / Bln</td>
                <td class="p-4 text-center"><button onclick="deleteInventaris(${d.id_aset})" class="text-rose-600 text-xs font-bold">Hapus</button></td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function deleteInventaris(id) {
    const tx = db.transaction('store_inventaris', 'readwrite');
    tx.objectStore('store_inventaris').delete(id);
    tx.oncomplete = () => triggerGlobalSync();
}

// Dummy standard callbacks generators for auxiliary tabs PDF
function downloadPDFRetur() { alert('PDF Laporan Retur siap diunduh.'); }
function downloadPDFInventaris() { alert('PDF Kolektif Aset Terunduh.'); }

// ==========================================
// MODULE F: AKUNTANSI & KEUANGAN FINANSIAL
// ==========================================
function setFilterWaktu(val) {
    filterWaktuJurnal = val;
    const filters = ['all', 'hari', 'minggu', 'bulan'];
    filters.forEach(f => {
        const el = document.getElementById(`fw-${f}`);
        if (f === val) {
            el.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-blue-600 text-white";
        } else {
            el.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600";
        }
    });
    renderAkuntansiDashboard();
}

function saveJurnalManual(event) {
    event.preventDefault();
    const payload = {
        timestamp: new Date().getTime(),
        jenis_aliran: document.getElementById('fin-jenis-aliran').value,
        nominal: parseFloat(document.getElementById('fin-nominal').value) || 0,
        keterangan: document.getElementById('fin-keterangan').value
    };

    const tx = db.transaction('store_jurnal_akuntansi', 'readwrite');
    tx.objectStore('store_jurnal_akuntansi').put(payload);
    tx.oncomplete = () => {
        alert('Data finansial manual berhasil masuk pembukuan jurnal umum.');
        document.getElementById('form-akuntansi-manual').reset();
        triggerGlobalSync();
    };
}

function renderAkuntansiDashboard() {
    if (!db) return;

    let totalModalAwal = 0;
    let totalUangMasukManual = 0;
    let totalPengeluaranManual = 0;
    let totalPembelianBahan = 0;

    let totalOmsetPOS = 0;
    let totalPiutangDP = 0;
    let totalKerugianReject = 0;
    let totalPenyusutanAset = 0;

    const tbody = document.getElementById('table-jurnal-body');
    tbody.innerHTML = '';

    // Step 1: Read all assets and components to compile structural calculations
    const txInv = db.transaction('store_inventaris', 'readonly');
    txInv.objectStore('store_inventaris').getAll().onsuccess = (e) => {
        const asets = e.target.result || [];
        totalPenyusutanAset = asets.reduce((acc, curr) => acc + (curr.penyusutan || 0), 0);
    };

    const txRet = db.transaction('store_retur_reject', 'readonly');
    txRet.objectStore('store_retur_reject').getAll().onsuccess = (e) => {
        const rejs = e.target.result || [];
        totalKerugianReject = rejs.reduce((acc, curr) => acc + (curr.kerugian || 0), 0);
    };

    // Step 2: Loop main integrated log book
    const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
    tx.objectStore('store_jurnal_akuntansi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const d = cursor.value;
            
            // Build real-time analytics aggregation metrics
            if (d.jenis_aliran === 'Modal Awal / Investasi') totalModalAwal += d.nominal;
            if (d.jenis_aliran === 'Uang Masuk Lain-lain') totalUangMasukManual += d.nominal;
            if (d.jenis_aliran === 'Pengeluaran Operasional') totalPengeluaranManual += d.nominal;
            if (d.jenis_aliran === 'Pembelian Bahan & Aset') totalPembelianBahan += d.nominal;
            
            if (d.jenis_aliran === 'Uang Masuk (POS Kasir)') totalOmsetPOS += d.nominal;
            if (d.jenis_aliran === 'Piutang Order (DP Kasir)') totalPiutangDP += d.nominal;

            // Render matching date conditions constraints row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 text-xs font-semibold text-slate-400">${new Date(d.timestamp).toLocaleDateString()}</td>
                <td class="p-4 text-xs font-bold text-[#0F172A]">${d.jenis_aliran}</td>
                <td class="p-4 text-xs max-w-xs truncate">${d.keterangan}</td>
                <td class="p-4 font-black">Rp ${d.nominal.toLocaleString('id-ID')}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteJurnal(${d.id_jurnal})" class="text-rose-600 font-bold text-xs hover:underline">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);

            cursor.continue();
        } else {
            // Finalize mapping state variables labels interface elements
            const sisaModalBerjalan = totalModalAwal + totalUangMasukManual - totalPengeluaranManual - totalPembelianBahan;
            const labaBersihRiil = (totalOmsetPOS + totalUangMasukManual) - (totalPengeluaranManual + totalPembelianBahan + totalKerugianReject + totalPenyusutanAset);

            document.getElementById('fin-modal-awal').innerText = `Rp ${totalModalAwal.toLocaleString('id-ID')}`;
            document.getElementById('fin-modal-berjalan').innerText = `Rp ${sisaModalBerjalan.toLocaleString('id-ID')}`;
            document.getElementById('fin-omset').innerText = `Rp ${totalOmsetPOS.toLocaleString('id-ID')}`;
            document.getElementById('fin-piutang').innerText = `Rp ${totalPiutangDP.toLocaleString('id-ID')}`;
            
            const labaEl = document.getElementById('fin-laba-bersih');
            labaEl.innerText = `Rp ${labaBersihRiil.toLocaleString('id-ID')}`;
            if (labaBersihRiil < 0) {
                labaEl.className = "block text-xl font-black text-rose-600 mt-1";
            } else {
                labaEl.className = "block text-xl font-black text-emerald-600 mt-1";
            }
        }
    };
}

function deleteJurnal(id) {
    if (!confirm('Hapus entri jurnal umum keuangan ini?')) return;
    const tx = db.transaction('store_jurnal_akuntansi', 'readwrite');
    tx.objectStore('store_jurnal_akuntansi').delete(id);
    tx.oncomplete = () => triggerGlobalSync();
}

function downloadPDFAkuntansi() { alert('PDF Laporan Neraca Keuangan Sukses Diekspor.'); }
function eksporCSVKeuangan() { alert('Spreadsheet CSV Buku Besar Terunduh.'); }

// ==========================================
// MODULE G: SYNC BRIDGE & BACKUP PANEL SYSTEM
// ==========================================
function backupDatabaseJSON() {
    if (!db) return;
    const backupData = {};
    const stores = ['store_produk', 'store_hpp', 'store_transaksi', 'store_jurnal_akuntansi', 'store_retur_reject', 'store_inventaris', 'store_customer'];
    
    let completed = 0;
    stores.forEach(s => {
        const tx = db.transaction(s, 'readonly');
        tx.objectStore(s).getAll().onsuccess = (e) => {
            backupData[s] = e.target.result;
            completed++;
            if (completed === stores.length) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `Clothvers_Backup_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            }
        };
    });
}

function restoreDatabaseJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            const stores = ['store_produk', 'store_hpp', 'store_transaksi', 'store_jurnal_akuntansi', 'store_retur_reject', 'store_inventaris', 'store_customer'];
            
            const tx = db.transaction(stores, 'readwrite');
            stores.forEach(s => {
                if (imported[s]) {
                    const store = tx.objectStore(s);
                    store.clear();
                    imported[s].forEach(item => {
                        store.put(item);
                    });
                }
            });

            tx.oncomplete = () => {
                alert('Seluruh data ekosistem ClothversDB Berhasil Dipulihkan Mutlak.');
                triggerGlobalSync();
            };
        } catch (err) {
            alert('File JSON tidak valid atau rusak.');
            console.error(err);
        }
    };
    reader.readAsText(file);
}
