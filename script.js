/**
 * Clothvers System v1.0 - CORE ENGINE JS
 * Pure IndexedDB Local Architecture - Target Longlife 2030+
 */

let db = null;
let currentModule = 'dashboard-stok';
let globalBulan = '01';
let globalTahun = '2026';

// State Keranjang POS Aktif
let posKeranjang = [];

// Inisialisasi Aplikasi Saat Window Dimuat
window.addEventListener('DOMContentLoaded', () => {
    initIndexedDB();
    setupCurrentDateFilter();
});

// Setup Default Filter Waktu Berdasarkan Waktu Sekarang
function setupCurrentDateFilter() {
    const d = new Date();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let yyyy = String(d.getFullYear());
    
    // Validasi range 2026-2030 sesuai spesifikasi sistem
    if (parseInt(yyyy) < 2026) yyyy = '2026';
    if (parseInt(yyyy) > 2030) yyyy = '2030';

    globalBulan = mm;
    globalTahun = yyyy;

    document.getElementById('globalBulan').value = mm;
    document.getElementById('globalTahun').value = yyyy;
    document.getElementById('mobileGlobalBulan').value = mm;
    document.getElementById('mobileGlobalTahun').value = yyyy;
}

// Sinkronisasi Filter Global Atas & Mobile
function syncGlobalFilters(el, type) {
    if (type === 'bulan') {
        globalBulan = el.value;
        document.getElementById('globalBulan').value = el.value;
        document.getElementById('mobileGlobalBulan').value = el.value;
    } else {
        globalTahun = el.value;
        document.getElementById('globalTahun').value = el.value;
        document.getElementById('mobileGlobalTahun').value = el.value;
    }
    // Refresh modul yang aktif jika butuh data terfilter waktu
    renderAllData();
}

// SPA Module Switcher dengan Desain Kontras Ringan Apple Style
function switchModule(modId) {
    currentModule = modId;
    const sections = ['dashboard-stok', 'dashboard-hpp', 'terminal-pos', 'crm-log', 'retur-reject', 'inventaris-alat', 'akuntansi-keuangan', 'sync-bridge'];
    
    sections.forEach(s => {
        const el = document.getElementById(s);
        if(el) {
            if (s === modId) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });

    // Update styling sidebar desktop
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#f5f5f7]', 'text-[#0F172A]');
        btn.classList.add('text-gray-600', 'hover:bg-gray-50');
    });
    const activeBtn = document.getElementById(`btn-${modId.split('-')[0]}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600', 'hover:bg-gray-50');
        activeBtn.classList.add('bg-[#f5f5f7]', 'text-[#0F172A]');
    }

    // Update styling bottom nav mobile
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-[#0F172A]');
        btn.classList.add('text-gray-400');
    });
    const activeMobileBtn = document.getElementById(`m-btn-${modId.split('-')[0]}`);
    if (activeMobileBtn) {
        activeMobileBtn.classList.remove('text-gray-400');
        activeMobileBtn.classList.add('text-[#0F172A]');
    }

    renderAllData();
}

// --- CORE INDEXEDDB CONTROLLER ---
function initIndexedDB() {
    const request = indexedDB.open('ClothversDB', 1);

    request.onupgradeneeded = (e) => {
        const database = e.target.result;
        
        if (!database.objectStoreNames.contains('store_produk')) {
            database.createObjectStore('store_produk', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('store_hpp')) {
            database.createObjectStore('store_hpp', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('store_transaksi')) {
            database.createObjectStore('store_transaksi', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('store_jurnal_akuntansi')) {
            database.createObjectStore('store_jurnal_akuntansi', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('store_retur_reject')) {
            database.createObjectStore('store_retur_reject', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('store_inventaris')) {
            database.createObjectStore('store_inventaris', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('store_customer')) {
            database.createObjectStore('store_customer', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        renderAllData();
    };

    request.onerror = () => {
        alert('Gagal memuat penyimpanan database lokal browser browser IndexedDB!');
    };
}

// Utility read/write data generic wrapper helper
function getStoreData(storeName, callback) {
    if (!db) return;
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => { callback(req.result); };
}

// Trigger render masal data sesuai modul aktif
function renderAllData() {
    getStoreData('store_produk', renderStokTable);
    getStoreData('store_hpp', renderHppTable);
    getStoreData('store_transaksi', renderPOSTable);
    getStoreData('store_customer', renderCustomerTable);
    getStoreData('store_retur_reject', renderReturTable);
    getStoreData('store_inventaris', renderInventarisTable);
    renderAkuntansi(); // Memiliki fungsi sorting/filter kompleks internal
    
    // Sinkronisasi data dropdown pilihan antar modul
    populateDropdowns();
}

// Helper Format Rupiah Murni
function formatRupiah(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// --- MODULE A LOGIC: INPUT STOK & MATRIKS VARIAN ---
function tambahBarisWarna() {
    const warnaInput = document.getElementById('inputWarnaBaru');
    const warna = warnaInput.value.trim();
    if (!warna) return;

    const wrapper = document.getElementById('wrapperMatriksWarna');
    const token = 'w_' + Date.now();

    const div = document.createElement('div');
    div.className = 'p-4 bg-white border border-gray-200 rounded-xl space-y-2 card-warna-item';
    div.dataset.warna = warna;
    div.innerHTML = `
        <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
            <span class="text-sm font-bold text-[#0F172A]"><i class="fa-solid fa-palette text-gray-400 mr-1"></i> Varian Warna: ${warna}</span>
            <button type="button" onclick="this.closest('.card-warna-item').remove()" class="text-red-500 text-xs font-bold hover:underline">Hapus Blok Warna</button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs min-w-[600px]">
                <thead>
                    <tr class="text-gray-400 font-bold border-b border-gray-100">
                        <th class="p-1">Size</th><th class="p-1 w-16">Stok</th><th class="p-1">HPP Varian Asli</th><th class="p-1">Harga Jual</th>
                        <th class="p-1 w-10">WH</th><th class="p-1 w-10">HT</th><th class="p-1 w-10">TB</th><th class="p-1">BB Rec</th>
                    </tr>
                </thead>
                <tbody>
                    ${['S','M','L','XL','2XL'].map(sz => `
                        <tr class="border-b border-gray-50 size-row" data-size="${sz}">
                            <td class="p-1 font-bold">${sz}</td>
                            <td class="p-1"><input type="number" class="w-14 border border-gray-200 rounded p-1 inp-stok" value=""></td>
                            <td class="p-1"><input type="number" class="w-24 border border-gray-200 rounded p-1 inp-hpp" value=""></td>
                            <td class="p-1"><input type="number" class="w-24 border border-gray-200 rounded p-1 inp-jual" value=""></td>
                            <td class="p-1"><input type="number" class="w-10 border border-gray-200 rounded p-1 inp-wh" value=""></td>
                            <td class="p-1"><input type="number" class="w-10 border border-gray-200 rounded p-1 inp-ht" value=""></td>
                            <td class="p-1"><input type="number" class="w-10 border border-gray-200 rounded p-1 inp-tb" value=""></td>
                            <td class="p-1"><input type="text" class="w-16 border border-gray-200 rounded p-1 inp-bb" value=""></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    wrapper.appendChild(div);
    warnaInput.value = '';
}

function simpanStok() {
    const id = document.getElementById('stokId').value;
    const nama_model = document.getElementById('namaModel').value.trim();
    const jenis_kain = document.getElementById('jenisKain').value.trim();
    const tipe_kain_gsm = document.getElementById('tipeKainGsm').value.trim();
    const detail_produksi = document.getElementById('detailProduksi').value.trim();

    if(!nama_model || !jenis_kain) { alert('Nama Model & Jenis Kain Wajib Diisi!'); return; }

    // Ekstraksi Matriks Varian
    const matriks_varian = [];
    const warnaCards = document.querySelectorAll('.card-warna-item');
    warnaCards.forEach(card => {
        const warna = card.dataset.warna;
        const rows = card.querySelectorAll('.size-row');
        rows.forEach(r => {
            const size = r.dataset.size;
            const stok = parseInt(r.querySelector('.inp-stok').value) || 0;
            const hpp_varian = parseFloat(r.querySelector('.inp-hpp').value) || 0;
            const jual_varian = parseFloat(r.querySelector('.inp-jual').value) || 0;
            const wh = parseFloat(r.querySelector('.inp-wh').value) || 0;
            const ht = parseFloat(r.querySelector('.inp-ht').value) || 0;
            const tb = parseFloat(r.querySelector('.inp-tb').value) || 0;
            const bb_rec = r.querySelector('.inp-bb').value || '';

            matriks_varian.push({ warna, size, stok, hpp_varian, jual_varian, wh, ht, tb, bb_rec });
        });
    });

    const payload = { nama_model, jenis_kain, tipe_kain_gsm, detail_produksi, matriks_varian };
    if(id) payload.id = parseInt(id);

    const tx = db.transaction('store_produk', 'readwrite');
    const store = tx.objectStore('store_produk');
    store.put(payload);

    tx.oncomplete = () => {
        resetFormStok();
        renderAllData();
        alert('Master Stok & Varian Pakaian berhasil disimpan ke IndexedDB.');
    };
}

function renderStokTable(data) {
    const tbody = document.getElementById('tableStokBody');
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-gray-400 text-xs">Belum ada data inventori pakaian terinput.</td></tr>`;
        return;
    }
    data.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition';
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-[#0F172A]">${p.nama_model}</td>
            <td class="py-3 px-4 text-xs text-gray-600">${p.jenis_kain} (${p.tipe_kain_gsm} GSM)</td>
            <td class="py-3 px-4 text-xs font-semibold text-gray-500">${p.matriks_varian.length} Total Kombinasi Varian</td>
            <td class="py-3 px-4 text-center space-x-1">
                <button onclick="editStok(${p.id})" class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold">Edit</button>
                <button onclick="hapusRecord('store_produk', ${p.id})" class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded font-bold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetFormStok() {
    document.getElementById('stokId').value = '';
    document.getElementById('formStok').reset();
    document.getElementById('wrapperMatriksWarna').innerHTML = '';
}

function editStok(id) {
    const tx = db.transaction('store_produk', 'readonly');
    const store = tx.objectStore('store_produk');
    store.get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById('stokId').value = p.id;
        document.getElementById('namaModel').value = p.nama_model;
        document.getElementById('jenisKain').value = p.jenis_kain;
        document.getElementById('tipeKainGsm').value = p.tipe_kain_gsm;
        document.getElementById('detailProduksi').value = p.detail_produksi;

        // Bangun Ulang Form Matriks
        const wrapper = document.getElementById('wrapperMatriksWarna');
        wrapper.innerHTML = '';
        
        // Grouping kembali berdasarkan warna
        const warnaGroup = {};
        p.matriks_varian.forEach(v => {
            if(!warnaGroup[v.warna]) warnaGroup[v.warna] = [];
            warnaGroup[v.warna].push(v);
        });

        Object.keys(warnaGroup).forEach(wName => {
            const items = warnaGroup[wName];
            const div = document.createElement('div');
            div.className = 'p-4 bg-white border border-gray-200 rounded-xl space-y-2 card-warna-item';
            div.dataset.warna = wName;
            div.innerHTML = `
                <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                    <span class="text-sm font-bold text-[#0F172A]"><i class="fa-solid fa-palette text-gray-400 mr-1"></i> Varian Warna: ${wName}</span>
                    <button type="button" onclick="this.closest('.card-warna-item').remove()" class="text-red-500 text-xs font-bold hover:underline">Hapus Blok Warna</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs min-w-[600px]">
                        <thead>
                            <tr class="text-gray-400 font-bold border-b border-gray-100">
                                <th class="p-1">Size</th><th class="p-1 w-16">Stok</th><th class="p-1">HPP Varian Asli</th><th class="p-1">Harga Jual</th>
                                <th class="p-1 w-10">WH</th><th class="p-1 w-10">HT</th><th class="p-1 w-10">TB</th><th class="p-1">BB Rec</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['S','M','L','XL','2XL'].map(sz => {
                                const vData = items.find(i => i.size === sz) || { stok:0, hpp_varian:0, jual_varian:0, wh:0, ht:0, tb:0, bb_rec:'' };
                                return `
                                <tr class="border-b border-gray-50 size-row" data-size="${sz}">
                                    <td class="p-1 font-bold">${sz}</td>
                                    <td class="p-1"><input type="number" class="w-14 border border-gray-200 rounded p-1 inp-stok" value="${vData.stok}"></td>
                                    <td class="p-1"><input type="number" class="w-24 border border-gray-200 rounded p-1 inp-hpp" value="${vData.hpp_varian}"></td>
                                    <td class="p-1"><input type="number" class="w-24 border border-gray-200 rounded p-1 inp-jual" value="${vData.jual_varian}"></td>
                                    <td class="p-1"><input type="number" class="w-10 border border-gray-200 rounded p-1 inp-wh" value="${vData.wh}"></td>
                                    <td class="p-1"><input type="number" class="w-10 border border-gray-200 rounded p-1 inp-ht" value="${vData.ht}"></td>
                                    <td class="p-1"><input type="number" class="w-10 border border-gray-200 rounded p-1 inp-tb" value="${vData.tb}"></td>
                                    <td class="p-1"><input type="text" class="w-16 border border-gray-200 rounded p-1 inp-bb" value="${vData.bb_rec}"></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            wrapper.appendChild(div);
        });
    };
}

// --- MODULE B LOGIC: MANAJEMEN HPP ---
function populateDropdowns() {
    if(!db) return;
    // Sinkronisasi untuk dropdown HPP
    const hppModelSel = document.getElementById('hppNamaModel');
    const posModelSel = document.getElementById('posSelectProduk');
    
    if(!hppModelSel || !posModelSel) return;

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').getAll().onsuccess = (e) => {
        const list = e.target.result;
        
        // Ambil value lama sebelum di-reset agar tidak hilang pilihan user
        const valHppLama = hppModelSel.value;
        const valPosLama = posModelSel.value;

        hppModelSel.innerHTML = '<option value="">-- Pilih Model --</option>';
        posModelSel.innerHTML = '<option value="">-- Pilih Model --</option>';

        list.forEach(p => {
            hppModelSel.innerHTML += `<option value="${p.nama_model}">${p.nama_model}</option>`;
            posModelSel.innerHTML += `<option value="${p.nama_model}">${p.nama_model}</option>`;
        });

        if(valHppLama) hppModelSel.value = valHppLama;
        if(valPosLama) posModelSel.value = valPosLama;
    };
}

function handleModelHppChange() {
    const modelName = document.getElementById('hppNamaModel').value;
    const sizeSel = document.getElementById('hppSize');
    sizeSel.innerHTML = '<option value="">-- Pilih Size --</option>';
    if(!modelName) return;

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').getAll().onsuccess = (e) => {
        const produk = e.target.result.find(p => p.nama_model === modelName);
        if(produk) {
            // Ambil unique size yang terdaftar di dalam matriks
            const sizes = [...new Set(produk.matriks_varian.map(v => v.size))];
            sizes.forEach(sz => {
                sizeSel.innerHTML += `<option value="${sz}">${sz}</option>`;
            });
        }
    };
}

function syncBiayaKainOtomatis() {
    const modelName = document.getElementById('hppNamaModel').value;
    const size = document.getElementById('hppSize').value;
    const inputBiaya = document.getElementById('hppBiayaKain');

    if(!modelName || !size) { inputBiaya.value = 0; return; }

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').getAll().onsuccess = (e) => {
        const produk = e.target.result.find(p => p.nama_model === modelName);
        if(produk) {
            // Ambil nilai HPP Varian Asli paling tinggi/pertama ditemukan untuk size tersebut
            const varian = produk.matriks_varian.find(v => v.size === size);
            inputBiaya.value = varian ? varian.hpp_varian : 0;
            hitungHppTotal();
        }
    };
}

function hitungHppTotal() {
    const biayaKain = parseFloat(document.getElementById('hppBiayaKain').value) || 0;
    const jahit = parseFloat(document.getElementById('hppOngkosJahit').value) || 0;
    const sablon = parseFloat(document.getElementById('hppSablon').value) || 0;
    const pack = parseFloat(document.getElementById('hppPackaging').value) || 0;
    const marginPct = parseFloat(document.getElementById('hppMarginPercent').value) || 0;

    const hppDasar = biayaKain + jahit + sablon + pack;
    const targetJualBersih = hppDasar * (1 + (marginPct / 100));

    document.getElementById('hppTotalDisplay').value = `${formatRupiah(hppDasar)} / Target Netto: ${formatRupiah(targetJualBersih)}`;

    // Simulasi Multi-Channel Manual % (User Mengisi Sendiri Potongan Administrasinya)
    const channels = ['WA', 'Shopee', 'TikTok', 'Reseller', 'Grosir'];
    channels.forEach(ch => {
        const admPct = parseFloat(document.getElementById(`adm${ch}`).value) || 0;
        // Rumus Gross-Up Harga agar profit margin tetap aman setelah dipotong biaya admin marketplace
        let hargaJualChannel = targetJualBersih;
        if(admPct < 100 && admPct > 0) {
            hargaJualChannel = targetJualBersih / (1 - (admPct / 100));
        }
        document.getElementById(`prc${ch}`).innerText = formatRupiah(Math.round(hargaJualChannel));
    });
}

function simpanHpp() {
    const id = document.getElementById('hppId').value;
    const nama_model = document.getElementById('hppNamaModel').value;
    const size_terpilih = document.getElementById('hppSize').value;
    const biaya_kain_otomatis = parseFloat(document.getElementById('hppBiayaKain').value) || 0;
    const ongkos_jahit = parseFloat(document.getElementById('hppOngkosJahit').value) || 0;
    const aplikasi_sablon = parseFloat(document.getElementById('hppSablon').value) || 0;
    const packaging = parseFloat(document.getElementById('hppPackaging').value) || 0;
    const margin_percent = parseFloat(document.getElementById('hppMarginPercent').value) || 0;

    if(!nama_model || !size_terpilih) { alert('Model dan Size wajib dipilih!'); return; }

    const hpp_total = biaya_kain_otomatis + ongkos_jahit + aplikasi_sablon + packaging;
    const targetJualBersih = hpp_total * (1 + (margin_percent / 100));

    const harga_jual_channels = {
        WA: Math.round(targetJualBersih / (1 - ((parseFloat(document.getElementById('admWA').value)||0)/100))),
        Shopee: Math.round(targetJualBersih / (1 - ((parseFloat(document.getElementById('admShopee').value)||0)/100))),
        TikTok: Math.round(targetJualBersih / (1 - ((parseFloat(document.getElementById('admTikTok').value)||0)/100))),
        Reseller: Math.round(targetJualBersih / (1 - ((parseFloat(document.getElementById('admReseller').value)||0)/100))),
        Grosir: Math.round(targetJualBersih / (1 - ((parseFloat(document.getElementById('admGrosir').value)||0)/100)))
    };

    const payload = {
        nama_model, size_terpilih, biaya_kain_otomatis, ongkos_jahit, aplikasi_sablon,
        packaging, margin_percent, hpp_total, harga_jual_channels,
        timestamp: `${globalTahun}-${globalBulan}-01`
    };
    if(id) payload.id = parseInt(id);

    const tx = db.transaction('store_hpp', 'readwrite');
    tx.objectStore('store_hpp').put(payload);
    tx.oncomplete = () => {
        resetFormHpp();
        renderAllData();
        alert('Skema Struktur HPP Multi-Channel tersimpan.');
    };
}

function renderHppTable(data) {
    const tbody = document.getElementById('tableHppBody');
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-gray-400 text-xs">Belum ada matriks HPP terkonfigurasi.</td></tr>`;
        return;
    }
    data.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 text-xs';
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-[#0F172A]">${h.nama_model} (Size ${h.size_terpilih})</td>
            <td class="py-3 px-4 font-semibold text-gray-700">${formatRupiah(h.hpp_total)}</td>
            <td class="py-3 px-4 space-y-0.5 text-gray-500">
                WA: <b>${formatRupiah(h.harga_jual_channels.WA)}</b> | 
                Shopee: <b>${formatRupiah(h.harga_jual_channels.Shopee)}</b> | 
                TikTok: <b>${formatRupiah(h.harga_jual_channels.TikTok)}</b> <br>
                Reseller: <b>${formatRupiah(h.harga_jual_channels.Reseller)}</b> | 
                Grosir: <b>${formatRupiah(h.harga_jual_channels.Grosir)}</b>
            </td>
            <td class="py-3 px-4 text-center space-x-1">
                <button onclick="editHpp(${h.id})" class="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold">Edit</button>
                <button onclick="hapusRecord('store_hpp', ${h.id})" class="text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded font-bold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetFormHpp() {
    document.getElementById('hppId').value = '';
    document.getElementById('formHpp').reset();
    document.getElementById('hppTotalDisplay').value = '';
    ['WA','Shopee','TikTok','Reseller','Grosir'].forEach(ch => {
        document.getElementById(`adm${ch}`).value = 0;
        document.getElementById(`prc${ch}`).innerText = 'Rp 0';
    });
}

function editHpp(id) {
    const tx = db.transaction('store_hpp', 'readonly');
    tx.objectStore('store_hpp').get(id).onsuccess = (e) => {
        const h = e.target.result;
        document.getElementById('hppId').value = h.id;
        document.getElementById('hppNamaModel').value = h.nama_model;
        handleModelHppChange();
        
        setTimeout(() => {
            document.getElementById('hppSize').value = h.size_terpilih;
            document.getElementById('hppBiayaKain').value = h.biaya_kain_otomatis;
            document.getElementById('hppOngkosJahit').value = h.ongkos_jahit;
            document.getElementById('hppSablon').value = h.aplikasi_sablon;
            document.getElementById('hppPackaging').value = h.packaging;
            document.getElementById('hppMarginPercent').value = h.margin_percent;
            
            // Hitung kembali persen mundur jika dibutuhkan, atau set manual bawaan input pembulatan
            hitungHppTotal();
        }, 100);
    };
}

// --- MODULE C LOGIC: TERMINAL POS KASIR ---
function handlePOSProdukChange() {
    const mName = document.getElementById('posSelectProduk').value;
    const varSel = document.getElementById('posSelectVarian');
    varSel.innerHTML = '';
    if(!mName) return;

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').getAll().onsuccess = (e) => {
        const p = e.target.result.find(i => i.nama_model === mName);
        if(p) {
            p.matriks_varian.forEach(v => {
                varSel.innerHTML += `<option value="${v.warna}|${v.size}">Warna ${v.warna} [Size ${v.size} - Stok:${v.stok}]</option>`;
            });
        }
    };
}

function tambahItemKeKeranjang() {
    const model = document.getElementById('posSelectProduk').value;
    const varianRaw = document.getElementById('posSelectVarian').value;
    const channel = document.getElementById('posChannel').value;

    if(!model || !varianRaw) return;
    const [warna, size] = varianRaw.split('|');

    // Tarik harga jual dari store_hpp yang cocok, jika tidak ada pakai default fallback Rp 150.000
    const tx = db.transaction('store_hpp', 'readonly');
    tx.objectStore('store_hpp').getAll().onsuccess = (e) => {
        const matchingHpp = e.target.result.find(h => h.nama_model === model && h.size_terpilih === size);
        
        let hargaTerpilih = 150000; // fallback
        if (matchingHpp) {
            if(channel === 'WA Retail') hargaTerpilih = matchingHpp.harga_jual_channels.WA;
            else if(channel === 'Shopee') hargaTerpilih = matchingHpp.harga_jual_channels.Shopee;
            else if(channel === 'TikTok') hargaTerpilih = matchingHpp.harga_jual_channels.TikTok;
            else if(channel === 'Reseller') hargaTerpilih = matchingHpp.harga_jual_channels.Reseller;
            else if(channel === 'Grosir') hargaTerpilih = matchingHpp.harga_jual_channels.Grosir;
        }

        // Cek apakah item sudah ada di keranjang
        const ada = posKeranjang.find(i => i.model === model && i.warna === warna && i.size === size);
        if(ada) {
            ada.qty++;
        } else {
            posKeranjang.push({ model, warna, size, harga: hargaTerpilih, qty: 1 });
        }

        renderKeranjangMekanisme();
    };
}

function renderKeranjangMekanisme() {
    const container = document.getElementById('keranjangBelanja');
    container.innerHTML = '';
    
    if(posKeranjang.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Belum ada item di dalam keranjang.</p>`;
        hitungTotalAkhirPOS();
        return;
    }

    posKeranjang.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-2 rounded-xl border border-gray-100 flex justify-between items-center text-xs';
        div.innerHTML = `
            <div>
                <span class="font-bold text-[#0F172A] block">${item.model}</span>
                <span class="text-gray-500 block text-[10px]">${item.warna} (${item.size}) @ ${formatRupiah(item.harga)}</span>
            </div>
            <div class="flex items-center gap-2">
                <input type="number" min="1" value="${item.qty}" class="w-10 border border-gray-300 p-0.5 rounded text-center font-bold" oninput="ubahQtyKeranjang(${index}, this.value)">
                <button onclick="hapusItemKeranjang(${index})" class="text-red-500 hover:text-red-700 font-bold"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });

    hitungTotalAkhirPOS();
}

function ubahQtyKeranjang(idx, val) {
    const qty = parseInt(val) || 1;
    posKeranjang[idx].qty = qty;
    hitungTotalAkhirPOS();
}

function hapusItemKeranjang(idx) {
    posKeranjang.splice(idx, 1);
    renderKeranjangMekanisme();
}

function hitungTotalAkhirPOS() {
    let subtotal = 0;
    posKeranjang.forEach(i => { subtotal += (i.harga * i.qty); });
    
    const diskon = parseFloat(document.getElementById('posDiskon').value) || 0;
    const grandTotal = Math.max(0, subtotal - diskon);

    document.getElementById('posSubtotal').innerText = formatRupiah(subtotal);
    document.getElementById('posDiskonDisplay').innerText = formatRupiah(diskon);
    document.getElementById('posGrandTotal').innerText = formatRupiah(grandTotal);
}

function prosesTransaksiPOS(statusBayar) {
    if(posKeranjang.length === 0) { alert('Keranjang belanja kosong!'); return; }
    
    const nama_customer = document.getElementById('posNamaCustomer').value.trim() || 'Pelanggan Umum';
    const nomor_hp = document.getElementById('posHpCustomer').value.trim() || '628';
    const channel = document.getElementById('posChannel').value;
    const ekspedisi = document.getElementById('posEkspedisi').value;
    const resi = document.getElementById('posResi').value;
    const diskon = parseFloat(document.getElementById('posDiskon').value) || 0;

    let subtotal = 0;
    posKeranjang.forEach(i => { subtotal += (i.harga * i.qty); });
    const total_akhir = Math.max(0, subtotal - diskon);

    const nota_id = 'INV-' + Date.now().toString().slice(-6).toUpperCase();
    const tgl_hari_ini = `${globalTahun}-${globalBulan}-${String(new Date().getDate()).padStart(2,'0')}`;

    const payloadTransaksi = {
        nota_id, tanggal: tgl_hari_ini, nama_customer, nomor_hp, channel,
        ekspedisi, resi, diskon, items: [...posKeranjang], total_akhir, status_bayar: statusBayar
    };

    // OPERASI WRITE TRANSAKSI & SYNC REAL-TIME CRM + AKUNTANSI KEUANGAN
    const tx = db.transaction(['store_transaksi', 'store_customer', 'store_jurnal_akuntansi'], 'readwrite');
    
    // 1. Simpan Transaksi Log POS
    tx.objectStore('store_transaksi').add(payloadTransaksi);

    // 2. Sinkronisasi Data Pelanggan Otomatis (CRM Log)
    const storeCust = tx.objectStore('store_customer');
    storeCust.getAll().onsuccess = (e) => {
        const allCust = e.target.result;
        const exist = allCust.find(c => c.nomor_hp === nomor_hp);
        if(exist) {
            exist.total_transaksi += total_akhir;
            storeCust.put(exist);
        } else {
            storeCust.add({ nama_customer, nomor_hp, total_transaksi: total_akhir, timestamp: tgl_hari_ini });
        }
    };

    // 3. Sinkronisasi Ke Buku Laporan Jurnal Akuntansi Secara Live Otomatis
    const storeJurnal = tx.objectStore('store_jurnal_akuntansi');
    storeJurnal.add({
        tanggal: tgl_hari_ini,
        keterangan: `Penjualan POS POS (${nota_id}) - ${nama_customer} Channel ${channel}`,
        debit: statusBayar === 'Lunas' ? total_akhir : Math.round(total_akhir * 0.5), // Simulasi DP terima 50% cash di awal
        kredit: 0
    });

    tx.oncomplete = () => {
        alert(`Transaksi ${nota_id} Sukses Terproses!`);
        
        // Trigger Pembuatan Dokumen Struk Thermal PDF Instan
        generateNotaPDF(payloadTransaksi);

        // Reset Kasir
        posKeranjang = [];
        document.getElementById('posNamaCustomer').value = '';
        document.getElementById('posHpCustomer').value = '';
        document.getElementById('posDiskon').value = 0;
        document.getElementById('posEkspedisi').value = '';
        document.getElementById('posResi').value = '';
        
        renderKeranjangMekanisme();
        renderAllData();
    };
}

function renderPOSTable(data) {
    const tbody = document.getElementById('tablePOSBody');
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs">Belum ada nota transaksi terbuat hari ini.</td></tr>`;
        return;
    }
    data.reverse().forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 text-xs';
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-blue-800">${t.nota_id}<br><span class="text-[10px] text-gray-400 font-normal">${t.tanggal}</span></td>
            <td class="py-3 px-4"><b>${t.nama_customer}</b><br><span class="text-[10px] text-gray-500">${t.nomor_hp}</span></td>
            <td class="py-3 px-4"><span class="bg-gray-100 px-1.5 py-0.5 rounded font-semibold text-gray-700">${t.channel}</span> <span class="ml-1 bg-green-50 text-green-700 px-1 rounded font-black">${t.status_bayar}</span></td>
            <td class="py-3 px-4 font-black text-[#0F172A]">${formatRupiah(t.total_akhir)}</td>
            <td class="py-3 px-4 text-center space-x-1">
                <button onclick='cetakUlangNota(${JSON.stringify(t)})' class="text-xs border border-gray-300 font-bold px-2 py-0.5 rounded hover:bg-gray-100">PDF Struk</button>
                <button onclick="kirimWhatsAppStruk('${t.nomor_hp}', '${t.nota_id}', ${t.total_akhir}, '${t.nama_customer}')" class="text-xs bg-green-600 font-bold text-white px-2 py-0.5 rounded hover:bg-green-700"><i class="fa-brands fa-whatsapp"></i> WA</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function cetakUlangNota(transObj) {
    generateNotaPDF(transObj);
}

function kirimWhatsAppStruk(hp, nota, total, nama) {
    const textStr = `Halo ${nama}, Terimakasih telah berbelanja di Clothvers!\nBerikut rincian Nota Transaksi Anda:\nID Nota: ${nota}\nTotal Akhir: ${formatRupiah(total)}\nStatus: LUNAS/TERTUNGGAK DIARSIP.\nNota fisik otomatis terlampir di sistem ERP browser kasir kami.`;
    const encoded = encodeURIComponent(textStr);
    window.open(`https://wa.me/${hp}?text=${encoded}`, '_blank');
}

// --- GENERATOR STRUK NOTA PDF THERMAL VIA JSPDF ---
function generateNotaPDF(t) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 150] }); // Format Kertas Kasir Thermal 80mm

    doc.setFontSize(10);
    doc.setFont("Helvetica", "Bold");
    doc.text("CLOTHVERS SYSTEM v1.0", 40, 10, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("Helvetica", "Normal");
    doc.text("Premium Apparel Omni-Device ERP", 40, 14, { align: "center" });
    doc.text("----------------------------------------------------------------------", 40, 18, { align: "center" });

    doc.text(`Nota ID  : ${t.nota_id}`, 5, 23);
    doc.text(`Tanggal  : ${t.tanggal}`, 5, 27);
    doc.text(`Customer : ${t.nama_customer} (${t.nomor_hp})`, 5, 31);
    doc.text(`Channel  : ${t.channel} / Ekspedisi: ${t.ekspedisi || '-'}`, 5, 35);
    doc.text("----------------------------------------------------------------------", 40, 40, { align: "center" });

    let y = 45;
    doc.setFont("Helvetica", "Bold");
    doc.text("Item Varian", 5, y);
    doc.text("Qty", 55, y);
    doc.text("Total", 75, y, { align: "right" });
    doc.text("----------------------------------------------------------------------", 40, y + 3, { align: "center" });
    
    y += 7;
    doc.setFont("Helvetica", "Normal");
    t.items.forEach(i => {
        doc.text(`${i.model} - ${i.warna} (${i.size})`, 5, y);
        doc.text(`${i.qty}x`, 55, y);
        doc.text(formatRupiah(i.harga * i.qty), 75, y, { align: "right" });
        y += 5;
    });

    doc.text("----------------------------------------------------------------------", 40, y, { align: "center" });
    y += 4;
    doc.text("Diskon Voucher:", 5, y);
    doc.text(`-${formatRupiah(t.diskon)}`, 75, y, { align: "right" });
    y += 4;
    doc.setFont("Helvetica", "Bold");
    doc.text("GRAND TOTAL:", 5, y);
    doc.text(formatRupiah(t.total_akhir), 75, y, { align: "right" });
    
    y += 8;
    doc.setFontSize(6);
    doc.setFont("Helvetica", "Oblique");
    doc.text("Terimakasih Atas Kepercayaan Anda", 40, y, { align: "center" });
    doc.text("Made in by Clothvers x Elevatio", 40, y+3, { align: "center" });

    doc.save(`Struk_${t.nota_id}.pdf`);
}

// --- MODULE D LOGIC: DATABASE CUSTOMER ---
function renderCustomerTable(data) {
    const tbody = document.getElementById('tableCustomerBody');
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs">Belum ada database customer terekam.</td></tr>`;
        return;
    }
    data.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 text-sm';
        tr.innerHTML = `
            <td class="py-3 px-4 text-xs text-gray-500">${c.timestamp || '-'}</td>
            <td class="py-3 px-4 font-bold text-[#0F172A]">${c.nama_customer}</td>
            <td class="py-3 px-4 font-semibold text-gray-600">${c.nomor_hp}</td>
            <td class="py-3 px-4 text-xs text-blue-700 font-bold">${formatRupiah(c.total_transaksi)}</td>
            <td class="py-3 px-4 text-center">
                <button onclick="hapusRecord('store_customer', ${c.id})" class="text-red-600 font-bold text-xs hover:underline">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODULE E LOGIC: RETUR REJECT & INVENTARIS ---
function simpanRetur() {
    const id = document.getElementById('returId').value;
    const nota_id_asal = document.getElementById('returNota').value.trim();
    const jenis_klaim = document.getElementById('returJenis').value;
    const item_keterangan = document.getElementById('returItem').value;
    const kerugian_nominal = parseFloat(document.getElementById('returRugi').value) || 0;
    const catatan = document.getElementById('returKeterangan').value;

    if(!nota_id_asal || !item_keterangan) { alert('Isi data nota dan item klaim!'); return; }

    const tgl_hari_ini = `${globalTahun}-${globalBulan}-${String(new Date().getDate()).padStart(2,'0')}`;
    const payload = { nota_id_asal, jenis_klaim, item_keterangan, kerugian_nominal, catatan, tanggal: tgl_hari_ini };
    if(id) payload.id = parseInt(id);

    const tx = db.transaction(['store_retur_reject', 'store_jurnal_akuntansi'], 'readwrite');
    tx.objectStore('store_retur_reject').put(payload);
    
    // Sinkronisasi kerugian finansial otomatis ke jurnal pengeluaran (Kredit) jika cacat produksi
    if(jenis_klaim === 'Cacat Produksi' && kerugian_nominal > 0) {
        tx.objectStore('store_jurnal_akuntansi').add({
            tanggal: tgl_hari_ini,
            keterangan: `Kerugian Cacat Produksi Keluar Dari Nota Asal ${nota_id_asal}`,
            debit: 0,
            kredit: kerugian_nominal
        });
    }

    tx.oncomplete = () => {
        resetFormRetur();
        renderAllData();
        alert('Log Kendala Retur Masalah Terbuku.');
    };
}

function renderReturTable(data) {
    const tbody = document.getElementById('tableReturBody');
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs">Aman. Belum ada catatan klaim retur reject.</td></tr>`;
        return;
    }
    data.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 text-xs';
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-gray-700">${r.nota_id_asal}</td>
            <td class="py-3 px-4"><span class="px-1.5 py-0.5 rounded font-bold ${r.jenis_klaim === 'Cacat Produksi'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-600'}">${r.jenis_klaim}</span></td>
            <td class="py-3 px-4"><b>${r.item_keterangan}</b><br><span class="text-red-500 font-semibold">${formatRupiah(r.kerugian_nominal)}</span></td>
            <td class="py-3 px-4 text-gray-500">${r.catatan || '-'}</td>
            <td class="py-3 px-4 text-center">
                <button onclick="hapusRecord('store_retur_reject', ${r.id})" class="text-red-600 font-bold hover:underline">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetFormRetur() {
    document.getElementById('returId').value = '';
    document.getElementById('formRetur').reset();
}

// --- INVENTARIS ENGINE CONTROLLER ---
function simpanInventaris() {
    const id = document.getElementById('inventarisId').value;
    const nama_aset = document.getElementById('invNama').value.trim();
    const nilai_perolehan = parseFloat(document.getElementById('invHarga').value) || 0;
    const masa_manfaat_bulan = parseInt(document.getElementById('invMasa').value) || 1;
    const keterangan = document.getElementById('invKet').value;

    if(!nama_aset || nilai_perolehan <= 0) { alert('Validasi kelayakan data aset gagal!'); return; }

    const penyusutan_bulanan = Math.round(nilai_perolehan / masa_manfaat_bulan);
    const payload = { nama_aset, nilai_perolehan, masa_manfaat_bulan, penyusutan_bulanan, keterangan };
    if(id) payload.id = parseInt(id);

    const tx = db.transaction('store_inventaris', 'readwrite');
    tx.objectStore('store_inventaris').put(payload);
    tx.oncomplete = () => {
        resetFormInventaris();
        renderAllData();
        alert('Data Inventori Aset Usaha Terarsip.');
    };
}

function renderInventarisTable(data) {
    const tbody = document.getElementById('tableInventarisBody');
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs">Aset kerja kosong.</td></tr>`;
        return;
    }
    data.forEach(i => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 text-xs';
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-[#0F172A]">${i.nama_aset}<br><span class="text-[10px] text-gray-400 font-normal">${i.keterangan||''}</span></td>
            <td class="py-3 px-4 text-gray-700 font-medium">${formatRupiah(i.nilai_perolehan)}</td>
            <td class="py-3 px-4 text-gray-500">${i.masa_manfaat_bulan} Bulan</td>
            <td class="py-3 px-4 text-red-600 font-bold">${formatRupiah(i.penyusutan_bulanan)} / bln</td>
            <td class="py-3 px-4 text-center">
                <button onclick="hapusRecord('store_inventaris', ${i.id})" class="text-red-500 hover:underline font-bold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetFormInventaris() {
    document.getElementById('inventarisId').value = '';
    document.getElementById('formInventaris').reset();
}

// --- MODULE F LOGIC: DASHBOARD AKUNTANSI KEUANGAN ---
function renderAkuntansi() {
    if(!db) return;
    const filterWaktu = document.getElementById('jurnalFilterWaktu').value;
    const tbody = document.getElementById('tableAkuntansiBody');
    
    const tx = db.transaction(['store_jurnal_akuntansi', 'store_inventaris'], 'readonly');
    
    let penyusutanKolektif = 0;
    tx.objectStore('store_inventaris').getAll().onsuccess = (ev) => {
        ev.target.result.forEach(asset => { penyusutanKolektif += asset.penyusutan_bulanan; });
    };

    tx.objectStore('store_jurnal_akuntansi').getAll().onsuccess = (e) => {
        let jurnalList = e.target.result;
        tbody.innerHTML = '';

        // Otomatis inject data penyusutan berjalan fiktif akhir bulan di sistem display sebagai beban akuntansi
        if(penyusutanKolektif > 0) {
            jurnalList.push({
                tanggal: `${globalTahun}-${globalBulan}-28`,
                keterangan: 'Akumulasi Beban Penyusutan Rutin Bulanan Seluruh Alat Kerja',
                debit: 0,
                kredit: penyusutanKolektif,
                isSystemGenerated: true
            });
        }

        // Jalankan Filter Waktu Fleksibel s.d 2030
        const tglHariIni = `${globalTahun}-${globalBulan}-${String(new Date().getDate()).padStart(2,'0')}`;
        if(filterWaktu === 'hari') {
            jurnalList = jurnalList.filter(j => j.tanggal === tglHariIni);
        } else if(filterWaktu === 'bulan') {
            jurnalList = jurnalList.filter(j => j.tanggal.startsWith(`${globalTahun}-${globalBulan}`));
        } else if(filterWaktu === 'tahun') {
            jurnalList = jurnalList.filter(j => j.tanggal.startsWith(globalTahun));
        }

        let totalOmset = 0;
        let totalKredit = 0;

        if(jurnalList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400 text-xs">Arus Kas Bersih Kosong Pada Filter Ini.</td></tr>`;
            document.getElementById('finOmset').innerText = 'Rp 0';
            document.getElementById('finRugi').innerText = 'Rp 0';
            return;
        }

        jurnalList.forEach(j => {
            totalOmset += j.debit;
            totalKredit += j.kredit;

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 text-xs';
            tr.innerHTML = `
                <td class="py-3 px-4 text-gray-400 font-mono">${j.tanggal}</td>
                <td class="py-3 px-4 font-bold text-gray-700">${j.keterangan}</td>
                <td class="py-3 px-4 text-green-700 font-bold">${j.debit > 0 ? formatRupiah(j.debit) : '-'}</td>
                <td class="py-3 px-4 text-red-600 font-bold">${j.kredit > 0 ? formatRupiah(j.kredit) : '-'}</td>
                <td class="py-3 px-4 text-center">
                    ${j.isSystemGenerated ? '<span class="text-gray-300">Auto</span>' : `<button onclick="hapusRecord('store_jurnal_akuntansi', ${j.id})" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>`}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Finansial Widget Panel Atas secara Real-Time live sync
        document.getElementById('finOmset').innerText = formatRupiah(totalOmset);
        document.getElementById('finRugi').innerText = formatRupiah(totalKredit);
        
        // Cari status DP/Piutang berjalan dari terminal POS global
        getStoreData('store_transaksi', (allTrans) => {
            let piutang = 0;
            allTrans.forEach(t => { if(t.status_bayar === 'DP') piutang += Math.round(t.total_akhir * 0.5); });
            document.getElementById('finPiutang').innerText = formatRupiah(piutang);
        });
    };
}

// Global generic record eliminator
function hapusRecord(storeName, keyId) {
    if(!confirm('Apakah Anda yakin mutlak ingin menghapus record data ini?')) return;
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(keyId);
    tx.oncomplete = () => { renderAllData(); };
}

// --- 🔄 4. PANEL BACKUP & RESTORE BRIDGE ENGINE VIA PHYSICAL JSON FILE ---
function backupDatabaseJSON() {
    const backupData = {};
    const stores = ['store_produk', 'store_hpp', 'store_transaksi', 'store_jurnal_akuntansi', 'store_retur_reject', 'store_inventaris', 'store_customer'];
    
    let counter = 0;
    stores.forEach(s => {
        getStoreData(s, (res) => {
            backupData[s] = res;
            counter++;
            if(counter === stores.length) {
                // Semua store sukses ditarik, trigger download payload berkas fisik .json
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                const dlAnchor = document.createElement('a');
                dlAnchor.setAttribute("href", dataStr);
                dlAnchor.setAttribute("download", `ClothversDB_Backup_${globalTahun}_${globalBulan}.json`);
                document.body.appendChild(dlAnchor);
                dlAnchor.click();
                dlAnchor.remove();
            }
        });
    });
}

function restoreDatabaseJSON(event) {
    const file = event.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            const stores = Object.keys(parsed);
            
            const tx = db.transaction(stores, 'readwrite');
            stores.forEach(sName => {
                const store = tx.objectStore(sName);
                // Bersihkan data lama terlebih dahulu agar sinkronisasi bersih murni
                store.clear();
                parsed[sName].forEach(item => {
                    store.put(item);
                });
            });

            tx.oncomplete = () => {
                alert('Database Clothvers Berhasil Disinkronkan & Dipulihkan Total!');
                renderAllData();
            };
        } catch(err) {
            alert('File JSON rusak atau format tidak kompatibel!');
        }
    };
    reader.readAsText(file);
}

// --- COLLECTIVE PDF EXPORTER GENERATOR VIA JSPDF & AUTOTABLE ---
function downloadPDFStok() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Master Kolektif Inventori Pakaian", 14, 15);
    
    getStoreData('store_produk', (data) => {
        const rows = [];
        data.forEach(p => {
            rows.push([p.nama_model, p.jenis_kain, p.tipe_kain_gsm, `${p.matriks_varian.length} Kombinasi`]);
        });
        doc.autoTable({
            head: [['Nama Model', 'Jenis Kain', 'GSM', 'Varian Terikat']],
            body: rows,
            startY: 22
        });
        doc.save('Laporan_Stok_Clothvers.pdf');
    });
}

function downloadPDFHpp() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Master Aturan Skema Harga Jual & HPP Multi-Channel", 14, 15);
    
    getStoreData('store_hpp', (data) => {
        const rows = [];
        data.forEach(h => {
            rows.push([
                `${h.nama_model} (${h.size_terpilih})`,
                formatRupiah(h.hpp_total),
                `WA:${formatRupiah(h.harga_jual_channels.WA)} | Shp:${formatRupiah(h.harga_jual_channels.Shopee)} | Tik:${formatRupiah(h.harga_jual_channels.TikTok)}`
            ]);
        });
        doc.autoTable({
            head: [['Model Pakaian', 'HPP Murni', 'Simulasi Distribusi Jual']],
            body: rows,
            startY: 22
        });
        doc.save('Laporan_HPP_Kolektif.pdf');
    });
}

function downloadPDFCustomer() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Database Log Pelanggan CRM Clothvers", 14, 15);
    getStoreData('store_customer', (data) => {
        const rows = data.map(c => [c.timestamp, c.nama_customer, c.nomor_hp, formatRupiah(c.total_transaksi)]);
        doc.autoTable({ head: [['Tgl Daftar', 'Nama Pelanggan', 'WhatsApp', 'Total Belanja']], body: rows, startY: 22 });
        doc.save('CRM_Database_Customer.pdf');
    });
}

function downloadPDFRetur() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Buku Rekap Retur & Barang Cacat Produksi", 14, 15);
    getStoreData('store_retur_reject', (data) => {
        const rows = data.map(r => [r.nota_id_asal, r.jenis_klaim, r.item_keterangan, formatRupiah(r.kerugian_nominal)]);
        doc.autoTable({ head: [['Nota Asal', 'Klaim', 'Deskripsi Item', 'Kerugian']], body: rows, startY: 22 });
        doc.save('Laporan_Retur_Masalah.pdf');
    });
}

function downloadPDFInventaris() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Aset & Nilai Penyusutan Bulanan", 14, 15);
    getStoreData('store_inventaris', (data) => {
        const rows = data.map(i => [i.nama_aset, formatRupiah(i.nilai_perolehan), `${i.masa_manfaat_bulan} bln`, formatRupiah(i.penyusutan_bulanan)]);
        doc.autoTable({ head: [['Nama Komponen Aset', 'Harga Perolehan', 'Masa Pakai', 'Beban/Bulan']], body: rows, startY: 22 });
        doc.save('Laporan_Penyusutan_Aset.pdf');
    });
}

function downloadPDFAkuntansi() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`Jurnal Umum Akumulasi Laporan Keuangan - Periode ${globalTahun}/${globalBulan}`, 14, 15);
    
    const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
    tx.objectStore('store_jurnal_akuntansi').getAll().onsuccess = (e) => {
        const rows = e.target.result.map(j => [j.tanggal, j.keterangan, formatRupiah(j.debit), formatRupiah(j.kredit)]);
        doc.autoTable({ head: [['Tanggal', 'Keterangan Rekening', 'Debit (Masuk)', 'Kredit (Keluar)']], body: rows, startY: 22 });
        doc.save('Jurnal_Akuntansi_Keuangan.pdf');
    };
}

// --- EXCEL CSV DATA EXPORTER BRIDGE ---
function downloadCSVAluntansi() {
    const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
    tx.objectStore('store_jurnal_akuntansi').getAll().onsuccess = (e) => {
        let csvContent = "data:text/csv;charset=utf-8,Tanggal,Keterangan,Debit,Kredit\n";
        e.target.result.forEach(j => {
            csvContent += `${j.tanggal},${j.keterangan.replace(/,/g, ' ')},${j.debit},${j.kredit}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Jurnal_Akuntansi_${globalTahun}_${globalBulan}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
}
