/**
 * CLOTVERS SYSTEM v1.0 - CORE ENGINE
 * Built exclusively using IndexedDB, Vanilla JS, and Chart.js
 */

let db = null;
let currentModule = 'dashboard-stok';
let currentKeuanganTab = 'tab-omset';
let posCart = [];

// Global charts instances references
let trendChartInstance = null;
let platformChartInstance = null;

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];

// Initialize App Lifecycle
document.addEventListener("DOMContentLoaded", () => {
    initPeriodFilters();
    initIndexedDB();
    renderSizeMatrixInputs();
});

// Render Dynamic Period Filter Dropdown (2026 - 2030)
function initPeriodFilters() {
    const filterSelect = document.getElementById('global-filter-periode');
    filterSelect.innerHTML = '';
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const currentYear = 2026;
    
    for (let y = 2026; y <= 2030; y++) {
        months.forEach((m, idx) => {
            const opt = document.createElement('option');
            const mVal = String(idx + 1).padStart(2, '0');
            opt.value = `${y}-${mVal}`;
            opt.innerText = `${m} ${y}`;
            if (y === 2026 && idx === 5) opt.selected = true; // Default Juni 2026 sesuai waktu berjalan
            filterSelect.appendChild(opt);
        });
    }
}

// Render dynamic input fields for size matrix
function renderSizeMatrixInputs() {
    const container = document.getElementById('size-matrix-inputs');
    container.innerHTML = '';
    SIZES.forEach(size => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-2 border border-gray-200 font-bold text-[#396399] text-center">${size}</td>
            <td class="p-1 border border-gray-200"><input type="number" id="sm-stok-${size}" value="10" required class="w-full bg-white border border-gray-200 p-1 text-center rounded text-xs text-[#0F172A]"></td>
            <td class="p-1 border border-gray-200"><input type="number" id="sm-hpp-${size}" value="45000" required class="w-full bg-white border border-gray-200 p-1 text-right rounded text-xs text-[#0F172A]"></td>
            <td class="p-1 border border-gray-200"><input type="number" id="sm-jual-${size}" value="85000" required class="w-full bg-white border border-gray-200 p-1 text-right rounded text-xs text-[#0F172A]"></td>
            <td class="p-1 border border-gray-200"><input type="number" id="sm-wh-${size}" placeholder="cm" required class="w-full bg-white border border-gray-200 p-1 text-center rounded text-xs text-[#0F172A]"></td>
            <td class="p-1 border border-gray-200"><input type="number" id="sm-ht-${size}" placeholder="cm" required class="w-full bg-white border border-gray-200 p-1 text-center rounded text-xs text-[#0F172A]"></td>
            <td class="p-1 border border-gray-200"><input type="number" id="sm-tb-${size}" placeholder="cm" required class="w-full bg-white border border-gray-200 p-1 text-center rounded text-xs text-[#0F172A]"></td>
            <td class="p-1 border border-gray-200"><input type="text" id="sm-bbrec-${size}" placeholder="e.g. 50-60" required class="w-full bg-white border border-gray-200 p-1 text-center rounded text-xs text-[#0F172A]"></td>
        `;
        container.appendChild(tr);
    });
}

// Initialize Open IndexedDB Local Engine
function initIndexedDB() {
    const request = indexedDB.open("ClotversDB", 1);
    
    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('store_produk')) db.createObjectStore('store_produk', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('store_hpp')) db.createObjectStore('store_hpp', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('store_transaksi')) db.createObjectStore('store_transaksi', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('store_jurnal_akuntansi')) db.createObjectStore('store_jurnal_akuntansi', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('store_retur_reject')) db.createObjectStore('store_retur_reject', { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        refreshAllTablesAndDropdowns();
    };
    
    request.onerror = () => alert("CRITICAL ERROR: Gagal memuat IndexedDB lokal komputer anda.");
}

// Global Dynamic Pipeline Filter Switch
function triggerGlobalFilter() {
    refreshAllTablesAndDropdowns();
}

function refreshAllTablesAndDropdowns() {
    renderTabelProduk();
    renderTabelHPP();
    populateDropdownsPOSnRetur();
    renderTabelPOS();
    renderAnalisisChartsDanTabel();
    renderTabelRetur();
    renderTabelKeuanganAkuntansi();
}

// Module Single-Page routing system layout
function switchModule(modId) {
    currentModule = modId;
    const modules = ['modul-stok', 'modul-hpp', 'modul-pos', 'modul-analisis', 'modul-retur', 'modul-keuangan', 'modul-sync'];
    modules.forEach(m => document.getElementById(m).classList.add('hidden'));
    
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(b => {
        b.classList.remove('bg-[#396399]', 'text-white');
        b.classList.add('text-[#1E293B]', 'hover:bg-gray-200');
    });

    let activeMod = '';
    let titleStr = '';
    let targetBtn = '';

    switch(modId) {
        case 'dashboard-stok': activeMod = 'modul-stok'; titleStr = 'Dashboard Input Stok Pakaian'; targetBtn = 'btn-stok'; break;
        case 'dashboard-hpp': activeMod = 'modul-hpp'; titleStr = 'Manajemen HPP & Penjualan'; targetBtn = 'btn-hpp'; break;
        case 'dashboard-pos': activeMod = 'modul-pos'; titleStr = 'Terminal POS Kasir Utama'; targetBtn = 'btn-pos'; break;
        case 'dashboard-analisis': activeMod = 'modul-analisis'; titleStr = 'Rekapan & Grafik Tren Analisis'; targetBtn = 'btn-analisis'; break;
        case 'dashboard-retur': activeMod = 'modul-retur'; titleStr = 'Modul Manajemen Retur & Reject'; targetBtn = 'btn-retur'; break;
        case 'dashboard-keuangan': activeMod = 'modul-keuangan'; titleStr = 'Dashboard Akuntansi & Keuangan Terikat'; targetBtn = 'btn-keuangan'; break;
        case 'dashboard-sync': activeMod = 'modul-sync'; titleStr = 'Inter-Device Data Sync Bridge'; targetBtn = 'btn-sync'; break;
    }

    document.getElementById(activeMod).classList.remove('hidden');
    document.getElementById('current-module-title').innerText = titleStr;
    document.getElementById(targetBtn).classList.add('bg-[#396399]', 'text-white');
    
    refreshAllTablesAndDropdowns();
}

// Get Selected Global Year Month Object Date Filter Helper
function getFilterRange() {
    return document.getElementById('global-filter-periode').value; // Returns YYYY-MM
}

function matchFilterDate(dateStr) {
    if(!dateStr) return false;
    return dateStr.startsWith(getFilterRange());
}

// ==========================================
// A. LOGIKA UTAMA: MANAJEMEN MASTER PRODUK
// ==========================================
function saveProduk(e) {
    e.preventDefault();
    const idEdit = document.getElementById('produk-id-edit').value;
    const namaModel = document.getElementById('prod-nama-model').value;
    const jenisKain = document.getElementById('prod-jenis-kain').value;
    const tipeGsm = document.getElementById('prod-tipe-gsm').value;
    const detailProd = document.getElementById('prod-detail-produksi').value;
    const warna = document.getElementById('prod-warna').value || "Default";

    let matriksVarian = [];
    SIZES.forEach(size => {
        matriksVarian.push({
            size: size,
            stok: parseInt(document.getElementById(`sm-stok-${size}`).value) || 0,
            hpp_varian: parseFloat(document.getElementById(`sm-hpp-${size}`).value) || 0,
            jual_varian: parseFloat(document.getElementById(`sm-jual-${size}`).value) || 0,
            wh: parseInt(document.getElementById(`sm-wh-${size}`).value) || 0,
            ht: parseInt(document.getElementById(`sm-ht-${size}`).value) || 0,
            tb: parseInt(document.getElementById(`sm-tb-${size}`).value) || 0,
            bb_rec: document.getElementById(`sm-bbrec-${size}`).value || "-"
        });
    });

    const dataProduk = {
        nama_model: namaModel,
        jenis_kain: jenisKain,
        tipe_kain_gsm: tipeGsm,
        detail_produksi: detailProd,
        warna: warna,
        matriks_varian: matriksVarian,
        timestamp: new Date().toISOString()
    };

    const tx = db.transaction('store_produk', 'readwrite');
    const store = tx.objectStore('store_produk');
    
    if (idEdit) {
        dataProduk.id = parseInt(idEdit);
        store.put(dataProduk);
    } else {
        store.add(dataProduk);
    }

    tx.oncomplete = () => {
        document.getElementById('form-produk').reset();
        document.getElementById('produk-id-edit').value = '';
        renderSizeMatrixInputs();
        refreshAllTablesAndDropdowns();
        alert("Master data produk berhasil tersimpan ke sistem browser local.");
    };
}

function renderTabelProduk() {
    const tbody = document.getElementById('tabel-produk-body');
    tbody.innerHTML = '';
    
    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const rowData = cursor.value;
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-100 hover:bg-gray-50 text-xs";
            
            let matrixHtml = `<div class="grid grid-cols-1 gap-1 text-[11px]">`;
            rowData.matriks_varian.forEach(v => {
                matrixHtml += `<div><strong>Size ${v.size} [Stok:${v.stok} Pcs]</strong> | HPP: Rp ${v.hpp_varian.toLocaleString()} | Jual: Rp ${v.jual_varian.toLocaleString()} | Dimensi: ${v.wh}x${v.ht}x${v.tb}cm (BB:${v.bb_rec}kg)</div>`;
            });
            matrixHtml += `</div>`;

            tr.innerHTML = `
                <td class="p-3 font-bold text-[#1E293B]">${rowData.nama_model}<br><span class="text-xs text-gray-500 font-normal">Warna: ${rowData.warna}</span></td>
                <td class="p-3">${rowData.jenis_kain}<br><span class="text-xs text-gray-500 font-normal">${rowData.tipe_kain_gsm} GSM</span></td>
                <td class="p-3">${matrixHtml}</td>
                <td class="p-3 text-center space-x-1 whitespace-nowrap">
                    <button onclick="editProduk(${rowData.id})" class="text-[#396399] font-bold hover:underline">Edit</button>
                    <button onclick="hapusRecord('store_produk', ${rowData.id})" class="text-red-600 font-bold hover:underline ml-1">Hapus</button>
                    <button onclick="stockOpnamePrompt(${rowData.id})" class="text-amber-700 font-bold hover:underline ml-1">Opname</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

function editProduk(id) {
    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById('produk-id-edit').value = p.id;
        document.getElementById('prod-nama-model').value = p.nama_model;
        document.getElementById('prod-jenis-kain').value = p.jenis_kain;
        document.getElementById('prod-tipe-gsm').value = p.tipe_kain_gsm;
        document.getElementById('prod-detail-produksi').value = p.detail_produksi;
        document.getElementById('prod-warna').value = p.warna;

        p.matriks_varian.forEach(v => {
            if(document.getElementById(`sm-stok-${v.size}`)) {
                document.getElementById(`sm-stok-${v.size}`).value = v.stok;
                document.getElementById(`sm-hpp-${v.size}`).value = v.hpp_varian;
                document.getElementById(`sm-jual-${v.size}`).value = v.jual_varian;
                document.getElementById(`sm-wh-${v.size}`).value = v.wh;
                document.getElementById(`sm-ht-${v.size}`).value = v.ht;
                document.getElementById(`sm-tb-${v.size}`).value = v.tb;
                document.getElementById(`sm-bbrec-${v.size}`).value = v.bb_rec;
            }
        });
        window.scrollTo({top: 0, behavior: 'smooth'});
    };
}

function stockOpnamePrompt(id) {
    const sizeSelect = prompt("Masukkan Ukuran Baju yang di-Opname (S/M/L/XL/2XL):");
    if(!sizeSelect || !SIZES.includes(sizeSelect.toUpperCase())) return alert("Ukuran dibatalkan atau tidak valid.");
    
    const newStock = prompt(`Masukkan Jumlah Stok Aktual Fisik yang Baru untuk Size ${sizeSelect.toUpperCase()}:`);
    if(newStock === null || isNaN(newStock)) return alert("Input stok tidak valid.");

    const tx = db.transaction('store_produk', 'readwrite');
    const store = tx.objectStore('store_produk');
    store.get(id).onsuccess = (e) => {
        let p = e.target.result;
        let matched = false;
        p.matriks_varian.forEach(v => {
            if(v.size === sizeSelect.toUpperCase()) {
                v.stok = parseInt(newStock);
                matched = true;
            }
        });
        if(matched) {
            store.put(p);
            tx.oncomplete = () => { refreshAllTablesAndDropdowns(); alert("Stock Opname Berhasil diperbarui."); };
        }
    };
}

// ==========================================
// B. LOGIKA MANAJEMEN ESTIMASI HPP LENGKAP
// ==========================================
function saveHPP(e) {
    e.preventDefault();
    const modelId = document.getElementById('hpp-model-select').value;
    const modelText = document.getElementById('hpp-model-select').options[document.getElementById('hpp-model-select').selectedIndex].text;
    const bKain = parseFloat(document.getElementById('hpp-kain').value) || 0;
    const bJahit = parseFloat(document.getElementById('hpp-jahit').value) || 0;
    const bSablon = parseFloat(document.getElementById('hpp-sablon').value) || 0;
    const bPack = parseFloat(document.getElementById('hpp-pack').value) || 0;
    const marginPercent = parseFloat(document.getElementById('hpp-margin').value) || 0;

    const hppTotal = bKain + bJahit + bSablon + bPack;
    const hargaJualBersih = hppTotal + (hppTotal * (marginPercent / 100));

    // Ambil input manual potongan admin (%)
    const admWa = parseFloat(document.getElementById('adm-wa').value) || 0;
    const admShopee = parseFloat(document.getElementById('adm-shopee').value) || 0;
    const admTiktok = parseFloat(document.getElementById('adm-tiktok').value) || 0;
    const admReseller = parseFloat(document.getElementById('adm-reseller').value) || 0;
    const admGrosir = parseFloat(document.getElementById('adm-grosir').value) || 0;

    const dataHpp = {
        produk_id: parseInt(modelId),
        nama_model: modelText,
        biaya_kain: bKain,
        ongkos_jahit: bJahit,
        aplikasi_sablon: bSablon,
        packaging: bPack,
        margin_percent: marginPercent,
        hpp_total: hppTotal,
        harga_jual_channels: {
            WhatsApp: hargaJualBersih + (hargaJualBersih * (admWa / 100)),
            Shopee: hargaJualBersih + (hargaJualBersih * (admShopee / 100)),
            TikTok: hargaJualBersih + (hargaJualBersih * (admTiktok / 100)),
            Reseller: hargaJualBersih - (hargaJualBersih * (admReseller / 100)), // skema diskon khusus reseller
            Grosir: hargaJualBersih - (hargaJualBersih * (admGrosir / 100))
        },
        timestamp: new Date().toISOString()
    };

    const tx = db.transaction('store_hpp', 'readwrite');
    tx.objectStore('store_hpp').add(dataHpp);
    tx.oncomplete = () => {
        document.getElementById('form-hpp').reset();
        refreshAllTablesAndDropdowns();
        alert("Kalkulasi simulasi HPP tersimpan.");
    };
}

function renderTabelHPP() {
    const tbody = document.getElementById('tabel-hpp-body');
    tbody.innerHTML = '';
    const tx = db.transaction('store_hpp', 'readonly');
    tx.objectStore('store_hpp').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const h = cursor.value;
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-100 text-xs";
            tr.innerHTML = `
                <td class="p-3 font-semibold">${h.nama_model}</td>
                <td class="p-3 font-bold text-red-700">Rp ${h.hpp_total.toLocaleString()}</td>
                <td class="p-3 font-bold text-emerald-700">Rp ${(h.hpp_total + (h.hpp_total*(h.margin_percent/100))).toLocaleString()} (${h.margin_percent}%)</td>
                <td class="p-3 text-gray-600">
                    WA: Rp ${Math.round(h.harga_jual_channels.WhatsApp).toLocaleString()} | 
                    SP: Rp ${Math.round(h.harga_jual_channels.Shopee).toLocaleString()} | 
                    TT: Rp ${Math.round(h.harga_jual_channels.TikTok).toLocaleString()} | 
                    RS: Rp ${Math.round(h.harga_jual_channels.Reseller).toLocaleString()} | 
                    GR: Rp ${Math.round(h.harga_jual_channels.Grosir).toLocaleString()}
                </td>
                <td class="p-3 text-center space-x-2 whitespace-nowrap">
                    <button onclick="downloadPDFSkemaHPP(${h.id})" class="text-[#396399] font-bold hover:underline">PDF Skema</button>
                    <button onclick="hapusRecord('store_hpp', ${h.id})" class="text-red-600 font-bold hover:underline">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
            cursor.continue();
        }
    };
}

// ==========================================
// C. LOGIKA TERMINAL POS KASIR ENGINE
// ==========================================
function populateDropdownsPOSnRetur() {
    const posSel = document.getElementById('pos-produk-select');
    const returSel = document.getElementById('retur-produk-select');
    const hppSel = document.getElementById('hpp-model-select');
    
    posSel.innerHTML = '';
    returSel.innerHTML = '';
    hppSel.innerHTML = '';

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const p = cursor.value;
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `${p.nama_model} (${p.warna})`;
            
            posSel.appendChild(opt.cloneNode(true));
            returSel.appendChild(opt.cloneNode(true));
            hppSel.appendChild(opt.cloneNode(true));
            cursor.continue();
        }
    };
}

function updatePosVarianDropdown() {
    const prodId = document.getElementById('pos-produk-select').value;
    const varianSel = document.getElementById('pos-varian-select');
    varianSel.innerHTML = '';
    if(!prodId) return;

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').get(parseInt(prodId)).onsuccess = (e) => {
        const p = e.target.result;
        p.matriks_varian.forEach(v => {
            const opt = document.createElement('option');
            opt.value = `${p.warna}|${v.size}|${v.jual_varian}`;
            opt.innerText = `Warna ${p.warna} - Size ${v.size} [Stok:${v.stok}] - Rp ${v.jual_varian.toLocaleString()}`;
            varianSel.appendChild(opt);
        });
    };
}

function addPosItem(e) {
    e.preventDefault();
    const prodId = document.getElementById('pos-produk-select').value;
    const modelText = document.getElementById('pos-produk-select').options[document.getElementById('pos-produk-select').selectedIndex].text;
    const varValue = document.getElementById('pos-varian-select').value;
    const qty = parseInt(document.getElementById('pos-qty').value) || 1;
    const platform = document.getElementById('pos-platform').value;

    if(!varValue) return alert("Pilih varian produk.");
    const [warna, size, hargaJual] = varValue.split('|');

    posCart.push({
        produk_id: parseInt(prodId),
        nama_model: modelText,
        warna: warna,
        size: size,
        harga_satuan: parseFloat(hargaJual),
        qty: qty,
        platform: platform,
        subtotal: parseFloat(hargaJual) * qty
    });

    renderPosCart();
}

function renderPosCart() {
    const tbody = document.getElementById('pos-cart-body');
    tbody.innerHTML = '';
    let total = 0;

    posCart.forEach((item, idx) => {
        total += item.subtotal;
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 text-xs";
        tr.innerHTML = `
            <td class="p-2 font-medium">${item.nama_model} (Warna:${item.warna} Size:${item.size})</td>
            <td class="p-2">${item.platform}</td>
            <td class="p-2 text-center">${item.qty}</td>
            <td class="p-2 text-right">Rp ${item.harga_satuan.toLocaleString()}</td>
            <td class="p-2 text-right font-bold">Rp ${item.subtotal.toLocaleString()}</td>
            <td class="p-2 text-center"><button onclick="posCart.splice(${idx},1); renderPosCart();" class="text-red-600 font-bold hover:underline">Batal</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('pos-txt-subtotal').innerText = `Rp ${total.toLocaleString()}`;
    recalculatePosBilling();
}

function recalculatePosBilling() {
    let subtotal = 0;
    posCart.forEach(i => subtotal += i.subtotal);
    
    const diskon = parseFloat(document.getElementById('pos-diskon').value) || 0;
    const ongkir = parseFloat(document.getElementById('pos-ongkir').value) || 0;
    const grandTotal = subtotal - diskon + ongkir;

    document.getElementById('pos-txt-grandtotal').innerText = `Rp ${grandTotal.toLocaleString()}`;

    const statusBayar = document.getElementById('pos-status-bayar').value;
    if(statusBayar === 'DP') {
        const dp = parseFloat(document.getElementById('pos-dp-amount').value) || 0;
        document.getElementById('pos-sisa-tagihan').value = Math.max(0, grandTotal - dp);
    } else if(statusBayar === 'Piutang') {
        document.getElementById('pos-sisa-tagihan').value = grandTotal;
    } else {
        document.getElementById('pos-sisa-tagihan').value = 0;
    }
}

function togglePoCalc() {
    const v = document.getElementById('pos-status-bayar').value;
    if (v === 'DP' || v === 'Piutang') {
        document.getElementById('po-calc-container').classList.remove('hidden');
        if(v === 'Piutang') {
            document.getElementById('pos-dp-amount').value = 0;
            document.getElementById('pos-dp-amount').disabled = true;
        } else {
            document.getElementById('pos-dp-amount').disabled = false;
        }
    } else {
        document.getElementById('po-calc-container').classList.add('hidden');
    }
    recalculatePosBilling();
}

function checkoutPos() {
    if(posCart.length === 0) return alert("Keranjang belanja kasir kosong.");

    const diskon = parseFloat(document.getElementById('pos-diskon').value) || 0;
    const ongkir = parseFloat(document.getElementById('pos-ongkir').value) || 0;
    const metode = document.getElementById('pos-metode').value;
    const statusBayar = document.getElementById('pos-status-bayar').value;
    const dpVal = parseFloat(document.getElementById('pos-dp-amount').value) || 0;
    const sisa = parseFloat(document.getElementById('pos-sisa-tagihan').value) || 0;
    const tglPo = document.getElementById('pos-tgl-po').value || "";
    const resi = document.getElementById('pos-resi').value || "-";
    const dateNow = new Date().toISOString().split('T')[0];

    const tx = db.transaction(['store_transaksi', 'store_produk', 'store_jurnal_akuntansi'], 'readwrite');

    posCart.forEach(item => {
        const trData = {
            tanggal_order: dateNow,
            tanggal_selesai_po: tglPo,
            produk_id: item.produk_id,
            nama_model: item.nama_model,
            platform_order: item.platform,
            varian_warna: item.warna,
            varian_size: item.size,
            qty: item.qty,
            harga_satuan: item.harga_satuan,
            diskon: diskon / posCart.length, // Alokasi rata diskon
            ongkir: ongkir / posCart.length,
            grand_total: item.subtotal - (diskon / posCart.length) + (ongkir / posCart.length),
            ekspedisi_resi: resi,
            metode_bayar: metode,
            status_bayar: statusBayar,
            jumlah_dp: dpVal / posCart.length,
            sisa_tagihan: sisa / posCart.length,
            timestamp: new Date().toISOString()
        };
        tx.objectStore('store_transaksi').add(trData);

        // Potong stok real-time inventory
        const pStore = tx.objectStore('store_produk');
        pStore.get(item.produk_id).onsuccess = (ev) => {
            let pObj = ev.target.result;
            if(pObj) {
                pObj.matriks_varian.forEach(mv => {
                    if(mv.size === item.size) {
                        mv.stok = Math.max(0, mv.stok - item.qty);
                    }
                });
                pStore.put(pObj);
            }
        };
    });

    // Catat ke log akuntansi arus kas otomatis
    let nominalKasMasuk = 0;
    if(statusBayar === 'Lunas') {
        posCart.forEach(i => nominalKasMasuk += i.subtotal);
        nominalKasMasuk = nominalKasMasuk - diskon + ongkir;
    } else if(statusBayar === 'DP') {
        nominalKasMasuk = dpVal;
    }

    if(nominalKasMasuk > 0) {
        const jurnal = {
            tanggal: dateNow,
            tipe_jurnal: 'Pemasukan POS',
            klasifikasi_akun: 'Omset Transaksi POS',
            nominal: nominalKasMasuk,
            keterangan_memo: `Transaksi POS Terminal Platform: multi-items (${metode})`,
            timestamp: new Date().toISOString()
        };
        tx.objectStore('store_jurnal_akuntansi').add(jurnal);
    }

    tx.oncomplete = () => {
        alert("Checkout Sukses Berhasil! Membuka pop-up cetak struk...");
        bukaStrukModal(dateNow, diskon, ongkir, metode, statusBayar, dpVal, sisa);
        posCart = [];
        document.getElementById('form-pos').reset();
        renderPosCart();
        refreshAllTablesAndDropdowns();
    };
}

function renderTabelPOS() {
    const tbody = document.getElementById('tabel-pos-body');
    tbody.innerHTML = '';
    const tx = db.transaction('store_transaksi', 'readonly');
    tx.objectStore('store_transaksi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const t = cursor.value;
            if(matchFilterDate(t.tanggal_order)) {
                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-100 text-xs";
                tr.innerHTML = `
                    <td class="p-3">${t.tanggal_order}<br><span class="text-[10px] text-gray-400">${t.timestamp.substring(11,16)} WIB</span></td>
                    <td class="p-3 font-semibold">${t.nama_model} (${t.varian_warna} - ${t.varian_size})</td>
                    <td class="p-3 text-center font-bold">${t.qty}</td>
                    <td class="p-3"><span class="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">${t.platform_order}</span></td>
                    <td class="p-3 font-bold">Rp ${t.grand_total.toLocaleString()}</td>
                    <td class="p-3"><span class="font-bold uppercase ${t.status_bayar==='Lunas'?'text-emerald-700':'text-red-600'}">${t.status_bayar}</span><br><span class="text-[10px] text-gray-500">Sisa: Rp ${t.sisa_tagihan.toLocaleString()}</span></td>
                    <td class="p-3 text-center">
                        <button onclick="hapusRecord('store_transaksi', ${t.id})" class="text-red-600 font-bold hover:underline">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

// Thermal Printer Pop-up Modal Rendering Logic
function bukaStrukModal(date, diskon, ongkir, metode, status, dp, sisa) {
    document.getElementById('struk-txt-date').innerText = `${date} | ${new Date().toLocaleTimeString()} WIB`;
    const container = document.getElementById('struk-items-container');
    container.innerHTML = '';

    let subtotal = 0;
    posCart.forEach(i => {
        subtotal += i.subtotal;
        const div = document.createElement('div');
        div.className = "flex justify-between";
        div.innerHTML = `<span>${i.nama_model.substring(0,18)} (${i.size}) x${i.qty}</span><span>Rp ${i.subtotal.toLocaleString()}</span>`;
        container.appendChild(div);
    });

    const grandTotal = subtotal - diskon + ongkir;
    document.getElementById('struk-subtotal').innerText = `Rp ${subtotal.toLocaleString()}`;
    document.getElementById('struk-diskon').innerText = `Rp ${diskon.toLocaleString()}`;
    document.getElementById('struk-ongkir').innerText = `Rp ${ongkir.toLocaleString()}`;
    document.getElementById('struk-grandtotal').innerText = `Rp ${grandTotal.toLocaleString()}`;

    if(status === 'Lunas') {
        document.getElementById('struk-lbl-bayar').innerText = "Bayar Bersih:";
        document.getElementById('struk-bayar').innerText = `Rp ${grandTotal.toLocaleString()} (${metode})`;
        document.getElementById('struk-row-sisa').classList.add('hidden');
    } else {
        document.getElementById('struk-lbl-bayar').innerText = "Bayar DP:";
        document.getElementById('struk-bayar').innerText = `Rp ${dp.toLocaleString()} (${metode})`;
        document.getElementById('struk-row-sisa').classList.remove('hidden');
        document.getElementById('struk-sisa').innerText = `Rp ${sisa.toLocaleString()}`;
    }

    document.getElementById('modal-struk').classList.remove('hidden');
    document.getElementById('modal-struk').classList.add('flex');
}

function closeStrukModal() {
    document.getElementById('modal-struk').classList.remove('flex');
    document.getElementById('modal-struk').classList.add('hidden');
}

// ==========================================
// D. LOGIKA REKAPAN & VISUALISASI CHART.JS
// ==========================================
function renderAnalisisChartsDanTabel() {
    const tbody = document.getElementById('tabel-analisis-body');
    tbody.innerHTML = '';

    let totalQty = 0;
    let modelCounts = {};
    let platformCounts = {};
    let dailyTrendData = {};

    const tx = db.transaction('store_transaksi', 'readonly');
    tx.objectStore('store_transaksi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const t = cursor.value;
            if(matchFilterDate(t.tanggal_order)) {
                totalQty += t.qty;
                modelCounts[t.nama_model] = (modelCounts[t.nama_model] || 0) + t.qty;
                platformCounts[t.platform_order] = (platformCounts[t.platform_order] || 0) + t.qty;
                dailyTrendData[t.tanggal_order] = (dailyTrendData[t.tanggal_order] || 0) + t.grand_total;

                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-100 hover:bg-gray-50";
                tr.innerHTML = `
                    <td class="p-3">${t.tanggal_order}</td>
                    <td class="p-3 font-medium">${t.nama_model}</td>
                    <td class="p-3">${t.varian_warna} - ${t.varian_size}</td>
                    <td class="p-3 text-center font-bold">${t.qty}</td>
                    <td class="p-3">${t.platform_order}</td>
                    <td class="p-3 text-right font-semibold">Rp ${t.grand_total.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        } else {
            // Update Widgets Data DOM
            document.getElementById('widget-total-qty').innerText = `${totalQty} Pcs`;
            
            let topModel = "-";
            let maxM = 0;
            for(let m in modelCounts){ if(modelCounts[m]>maxM){ maxM=modelCounts[m]; topModel=m; } }
            document.getElementById('widget-model-laris').innerText = topModel;

            let topPlat = "-";
            let maxP = 0;
            for(let p in platformCounts){ if(platformCounts[p]>maxP){ maxP=platformCounts[p]; topPlat=p; } }
            document.getElementById('widget-platform-top').innerText = topPlat;

            // Render/Update Chart.js Instances Canvas
            rebuildCharts(dailyTrendData, platformCounts);
        }
    };
}

function rebuildCharts(trendData, platformData) {
    // 1. Line/Bar Chart Tren Penjualan
    const ctxTrend = document.getElementById('chart-tren-penjualan').getContext('2d');
    if(trendChartInstance) trendChartInstance.destroy();
    
    const labelsTrend = Object.keys(trendData).sort();
    const valuesTrend = labelsTrend.map(k => trendData[k]);

    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: labelsTrend.length ? labelsTrend : ['No Data'],
            datasets: [{
                label: 'Omset Penjualan Bersih (Rp)',
                data: valuesTrend.length ? valuesTrend : [0],
                borderColor: '#396399',
                backgroundColor: 'rgba(57, 99, 153, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Pie/Donut Chart Distribusi Platform
    const ctxPlat = document.getElementById('chart-distribusi-platform').getContext('2d');
    if(platformChartInstance) platformChartInstance.destroy();

    const labelsPlat = Object.keys(platformData);
    const valuesPlat = labelsPlat.map(k => platformData[k]);

    platformChartInstance = new Chart(ctxPlat, {
        type: 'doughnut',
        data: {
            labels: labelsPlat.length ? labelsPlat : ['Belum Ada'],
            datasets: [{
                data: valuesPlat.length ? valuesPlat : [1],
                backgroundColor: ['#1E3A8A', '#396399', '#10B981', '#F59E0B', '#EF4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================
// E. LOGIKA MODUL RETUR & BARANG CACAT
// ==========================================
function toggleReturFields() {
    const j = document.getElementById('retur-jenis').value;
    if(j === 'Tukar Size') {
        document.getElementById('tukar-size-container').classList.remove('hidden');
        updateReturTujuanVarianDropdown();
    } else {
        document.getElementById('tukar-size-container').classList.add('hidden');
    }
}

function updateReturVarianDropdown() {
    const prodId = document.getElementById('retur-produk-select').value;
    const varSel = document.getElementById('retur-varian-select');
    varSel.innerHTML = '';
    if(!prodId) return;

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').get(parseInt(prodId)).onsuccess = (e) => {
        const p = e.target.result;
        p.matriks_varian.forEach(v => {
            const opt = document.createElement('option');
            opt.value = `${v.size}|${v.hpp_varian}`;
            opt.innerText = `Size ${v.size} (Stok:${v.stok})`;
            varSel.appendChild(opt);
        });
        toggleReturFields();
    };
}

function updateReturTujuanVarianDropdown() {
    const prodId = document.getElementById('retur-produk-select').value;
    const destSel = document.getElementById('retur-tujuan-varian-select');
    destSel.innerHTML = '';
    if(!prodId) return;

    const tx = db.transaction('store_produk', 'readonly');
    tx.objectStore('store_produk').get(parseInt(prodId)).onsuccess = (e) => {
        const p = e.target.result;
        p.matriks_varian.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.size;
            opt.innerText = `Tukar Ke Size ${v.size} (Tersedia:${v.stok})`;
            destSel.appendChild(opt);
        });
    };
}

function saveReturReject(e) {
    e.preventDefault();
    const jenis = document.getElementById('retur-jenis').value;
    const prodId = parseInt(document.getElementById('retur-produk-select').value);
    const modelText = document.getElementById('retur-produk-select').options[document.getElementById('retur-produk-select').selectedIndex].text;
    const varVal = document.getElementById('retur-varian-select').value;
    const qty = parseInt(document.getElementById('retur-qty').value) || 1;
    const ket = document.getElementById('retur-keterangan').value;
    const dateNow = new Date().toISOString().split('T')[0];

    if(!varVal) return alert("Pilih varian.");
    const [sizeAsal, hppAsal] = varVal.split('|');
    const nominalRugi = jenis === 'Cacat Produksi' ? parseFloat(hppAsal) * qty : 0;

    const tx = db.transaction(['store_retur_reject', 'store_produk', 'store_jurnal_akuntansi'], 'readwrite');

    const logData = {
        tanggal: dateNow,
        jenis: jenis,
        produk_id: prodId,
        nama_model: modelText,
        size: sizeAsal,
        qty: qty,
        keterangan: ket,
        nominal_rugi: nominalRugi,
        timestamp: new Date().toISOString()
    };
    tx.objectStore('store_retur_reject').add(logData);

    const pStore = tx.objectStore('store_produk');
    pStore.get(prodId).onsuccess = (ev) => {
        let pObj = ev.target.result;
        if(pObj) {
            if(jenis === 'Cacat Produksi') {
                // Potong secara permanen stok rusak
                pObj.matriks_varian.forEach(mv => { if(mv.size === sizeAsal) mv.stok = Math.max(0, mv.stok - qty); });
            } else {
                // Tukar size: kembalikan stok asal, kurangi stok baru tujuan
                const sizeTujuan = document.getElementById('retur-tujuan-varian-select').value;
                pObj.matriks_varian.forEach(mv => {
                    if(mv.size === sizeAsal) mv.stok += qty;
                    if(mv.size === sizeTujuan) mv.stok = Math.max(0, mv.stok - qty);
                });
            }
            pStore.put(pObj);
        }
    };

    // Jika barang cacat, otomatis lempar kerugian ke beban akuntansi operasional
    if(jenis === 'Cacat Produksi' && nominalRugi > 0) {
        const bJurnal = {
            tanggal: dateNow,
            tipe_jurnal: 'Pengeluaran',
            klasifikasi_akun: 'Kerugian Pabrik (Reject)',
            nominal: nominalRugi,
            keterangan_memo: `Beban rugi otomatis reject produksi model: ${modelText} x${qty}`,
            timestamp: new Date().toISOString()
        };
        tx.objectStore('store_jurnal_akuntansi').add(bJurnal);
    }

    tx.oncomplete = () => {
        document.getElementById('form-retur').reset();
        refreshAllTablesAndDropdowns();
        alert("Log status retur/reject diproses & disinkronisasi otomatis.");
    };
}

function renderTabelRetur() {
    const tbody = document.getElementById('tabel-retur-body');
    tbody.innerHTML = '';
    const tx = db.transaction('store_retur_reject', 'readonly');
    tx.objectStore('store_retur_reject').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const r = cursor.value;
            if(matchFilterDate(r.tanggal)) {
                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-100 text-xs";
                tr.innerHTML = `
                    <td class="p-3">${r.tanggal}</td>
                    <td class="p-3 font-bold ${r.jenis==='Cacat Produksi'?'text-red-600':'text-blue-600'}">${r.jenis}</td>
                    <td class="p-3">${r.nama_model} (Size:${r.size})</td>
                    <td class="p-3 text-center font-bold">${r.qty}</td>
                    <td class="p-3 font-semibold text-red-700">Rp ${r.nominal_rugi.toLocaleString()}</td>
                    <td class="p-3 italic text-gray-500">"${r.keterangan}"</td>
                    <td class="p-3 text-center">
                        <button onclick="hapusRecord('store_retur_reject', ${r.id})" class="text-red-600 font-bold hover:underline">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
            cursor.continue();
        }
    };
}

// ==========================================
// F. LOGIKA AKUNTANSI & LAPORAN KEUANGAN
// ==========================================
function switchKeuanganTab(tabId) {
    currentKeuanganTab = tabId;
    ['pane-tab-omset', 'pane-tab-pengeluaran', 'pane-tab-pemasukan'].forEach(p => document.getElementById(p).classList.add('hidden'));
    ['btn-tab-omset', 'btn-tab-pengeluaran', 'btn-tab-pemasukan'].forEach(b => {
        document.getElementById(b).classList.remove('bg-white', 'text-[#396399]', 'shadow-sm');
        document.getElementById(b).classList.add('text-gray-600');
    });

    if(tabId === 'tab-omset') {
        document.getElementById('pane-tab-omset').classList.remove('hidden');
        document.getElementById('btn-tab-omset').classList.add('bg-white', 'text-[#396399]', 'shadow-sm');
    } else if(tabId === 'tab-pengeluaran') {
        document.getElementById('pane-tab-pengeluaran').classList.remove('hidden');
        document.getElementById('btn-tab-pengeluaran').classList.add('bg-white', 'text-[#396399]', 'shadow-sm');
    } else {
        document.getElementById('pane-tab-pemasukan').classList.remove('hidden');
        document.getElementById('btn-tab-pemasukan').classList.add('bg-white', 'text-[#396399]', 'shadow-sm');
    }
    renderTabelKeuanganAkuntansi();
}

function saveJurnalManual(e, tipe) {
    e.preventDefault();
    const dateNow = new Date().toISOString().split('T')[0];
    let akun = "";
    let nominal = 0;
    let memo = "";

    if(tipe === 'Pengeluaran') {
        akun = document.getElementById('keluar-akun').value;
        nominal = parseFloat(document.getElementById('keluar-nominal').value) || 0;
        memo = document.getElementById('keluar-memo').value;
    } else {
        akun = document.getElementById('masuk-akun').value;
        nominal = parseFloat(document.getElementById('masuk-nominal').value) || 0;
        memo = document.getElementById('masuk-memo').value;
    }

    const dataJurnal = {
        tanggal: dateNow,
        tipe_jurnal: tipe,
        klasifikasi_akun: akun,
        nominal: nominal,
        keterangan_memo: memo,
        timestamp: new Date().toISOString()
    };

    const tx = db.transaction('store_jurnal_akuntansi', 'readwrite');
    tx.objectStore('store_jurnal_akuntansi').add(dataJurnal);
    tx.oncomplete = () => {
        document.getElementById('form-jurnal-keluar').reset();
        document.getElementById('form-jurnal-masuk').reset();
        refreshAllTablesAndDropdowns();
        alert(`Buku kas internal jurnaling ${tipe} tersimpan.`);
    };
}

function renderTabelKeuanganAkuntansi() {
    const tOmset = document.getElementById('tabel-keuangan-omset-body');
    const tKeluar = document.getElementById('tabel-keuangan-pengeluaran-body');
    const tMasuk = document.getElementById('tabel-keuangan-pemasukan-body');

    tOmset.innerHTML = '';
    tKeluar.innerHTML = '';
    tMasuk.innerHTML = '';

    const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
    tx.objectStore('store_jurnal_akuntansi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const j = cursor.value;
            if(matchFilterDate(j.tanggal)) {
                const tr = document.createElement('tr');
                tr.className = "border-b border-gray-100 text-xs";
                
                if(j.tipe_jurnal === 'Pemasukan POS') {
                    tr.innerHTML = `<td class="p-3">${j.tanggal}</td><td class="p-3 font-semibold">${j.klasifikasi_akun}</td><td class="p-3">${j.keterangan_memo}</td><td class="p-3 text-right font-bold text-emerald-700">Rp ${j.nominal.toLocaleString()}</td>`;
                    tOmset.appendChild(tr);
                } else if(j.tipe_jurnal === 'Pengeluaran') {
                    tr.innerHTML = `<td class="p-3">${j.tanggal}</td><td class="p-3 font-semibold text-red-700">${j.klasifikasi_akun}</td><td class="p-3">${j.keterangan_memo}</td><td class="p-3 text-right font-bold text-red-600">Rp ${j.nominal.toLocaleString()}</td><td class="p-3 text-center"><button onclick="hapusRecord('store_jurnal_akuntansi', ${j.id})" class="text-red-600 font-bold hover:underline">Hapus</button></td>`;
                    tKeluar.appendChild(tr);
                } else if(j.tipe_jurnal === 'Pemasukan Lain') {
                    tr.innerHTML = `<td class="p-3">${j.tanggal}</td><td class="p-3 font-semibold text-blue-700">${j.klasifikasi_akun}</td><td class="p-3">${j.keterangan_memo}</td><td class="p-3 text-right font-bold text-blue-600">Rp ${j.nominal.toLocaleString()}</td><td class="p-3 text-center"><button onclick="hapusRecord('store_jurnal_akuntansi', ${j.id})" class="text-red-600 font-bold hover:underline">Hapus</button></td>`;
                    tMasuk.appendChild(tr);
                }
            }
            cursor.continue();
        }
    };
}

// ==========================================
// G. DYNAMIC ENKAPSULASI JSON BRIDGE (SYNC)
// ==========================================
function backupDatabaseJSON() {
    const backupData = {};
    const storesList = ['store_produk', 'store_hpp', 'store_transaksi', 'store_jurnal_akuntansi', 'store_retur_reject'];
    let counter = 0;

    const tx = db.transaction(storesList, 'readonly');
    storesList.forEach(sName => {
        backupData[sName] = [];
        tx.objectStore(sName).getAll().onsuccess = (e) => {
            backupData[sName] = e.target.result;
            counter++;
            if(counter === storesList.length) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                const dlAnchor = document.createElement('a');
                dlAnchor.setAttribute("href", dataStr);
                dlAnchor.setAttribute("download", `CLOTVERS_BACKUP_SYSTEM_v1.0_${getFilterRange()}.json`);
                document.body.appendChild(dlAnchor);
                dlAnchor.click();
                dlAnchor.remove();
            }
        };
    });
}

function restoreDatabaseJSON(e) {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsedData = JSON.parse(event.target.result);
            const storesList = ['store_produk', 'store_hpp', 'store_transaksi', 'store_jurnal_akuntansi', 'store_retur_reject'];
            
            const tx = db.transaction(storesList, 'readwrite');
            storesList.forEach(sName => {
                if(parsedData[sName]) {
                    const store = tx.objectStore(sName);
                    store.clear(); // Bersihkan database usang untuk mencegah tabrakan data primary key auto-increment
                    parsedData[sName].forEach(item => {
                        store.put(item);
                    });
                }
            });

            tx.oncomplete = () => {
                alert("Sinkronisasi Sukses! Seluruh basis data Clotvers System berhasil dimigrasikan ke perangkat ini.");
                refreshAllTablesAndDropdowns();
            };
        } catch(err) {
            alert("Format berkas sinkronisasi JSON rusak atau tidak valid.");
        }
    };
    reader.readAsText(file);
}

// Global Delete Record Master Controller Function
function hapusRecord(storeName, id) {
    if(!confirm("Apakah anda yakin ingin menghapus dokumen arsip permanen ini?")) return;
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => {
        refreshAllTablesAndDropdowns();
    };
}

// ==========================================
// H. LOGIKA UTILITAS EKSPOR LAPORAN (PDF & CSV)
// ==========================================
function eksporCSVExcelPenjualan() {
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Nama Model,Warna,Size,QTY,Platform,Grand Total\n";
    const tx = db.transaction('store_transaksi', 'readonly');
    tx.objectStore('store_transaksi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const t = cursor.value;
            if(matchFilterDate(t.tanggal_order)) {
                csvContent += `${t.tanggal_order},${t.nama_model},${t.varian_warna},${t.varian_size},${t.qty},${t.platform_order},${t.grand_total}\n`;
            }
            cursor.continue();
        } else {
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Rekap_Penjualan_Clotvers_${getFilterRange()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };
}

function downloadPDFSkemaHPP(id) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const tx = db.transaction('store_hpp', 'readonly');
    tx.objectStore('store_hpp').get(id).onsuccess = (e) => {
        const h = e.target.result;
        doc.setFont("helvetica", "bold");
        doc.text("CLOTVERS SYSTEM v1.0 - LEMBAR KALKULASI HPP", 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Model Artikel: ${h.nama_model}`, 14, 28);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString()}`, 14, 34);
        
        const headers = [["Komponen Biaya", "Nominal Satuan (Rp)"]];
        const data = [
            ["Biaya Kain Utama", `Rp ${h.biaya_kain.toLocaleString()}`],
            ["Ongkos CMT / Jahit", `Rp ${h.ongkos_jahit.toLocaleString()}`],
            ["Aplikasi Sablon / Bordir", `Rp ${h.aplikasi_sablon.toLocaleString()}`],
            ["Packaging & Aksesoris", `Rp ${h.packaging.toLocaleString()}`],
            ["TOTAL NET HPP PRODUCTION", `Rp ${h.hpp_total.toLocaleString()}`],
            ["Target Margin Bersih", `${h.margin_percent}%`],
            ["Rekomendasi Jual Bersih", `Rp ${(h.hpp_total + (h.hpp_total*(h.margin_percent/100))).toLocaleString()}`]
        ];
        
        doc.autoTable({ startY: 40, head: headers, body: data, theme: 'grid' });
        doc.save(`Skema_HPP_Clotvers_${h.nama_model.replace(/\s+/g, '_')}.pdf`);
    };
}

function downloadLaporanPOSHarian() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`CLOTVERS v1.0 - LAPORAN KASIR POS PERIODE ${getFilterRange()}`, 14, 20);
    
    let tableData = [];
    const tx = db.transaction('store_transaksi', 'readonly');
    tx.objectStore('store_transaksi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const t = cursor.value;
            if(matchFilterDate(t.tanggal_order)) {
                tableData.push([t.tanggal_order, `${t.nama_model} (${t.varian_warna}-${t.varian_size})`, t.qty, t.platform_order, `Rp ${t.grand_total.toLocaleString()}`, t.status_bayar]);
            }
            cursor.continue();
        } else {
            doc.autoTable({
                startY: 28,
                head: [['Tanggal', 'Item Varian', 'QTY', 'Platform', 'Grand Total', 'Status']],
                body: tableData
            });
            doc.save(`Laporan_Kasir_POS_Clotvers_${getFilterRange()}.pdf`);
        }
    };
}

function downloadPDFAnalisis() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`CLOTVERS v1.0 - LAPORAN ANALISIS QUANTITATIVE PERIODE ${getFilterRange()}`, 14, 20);
    
    let tableData = [];
    const tx = db.transaction('store_transaksi', 'readonly');
    tx.objectStore('store_transaksi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const t = cursor.value;
            if(matchFilterDate(t.tanggal_order)) {
                tableData.push([t.tanggal_order, t.nama_model, `${t.varian_warna} - ${t.varian_size}`, t.qty, t.platform_order, `Rp ${t.grand_total.toLocaleString()}`]);
            }
            cursor.continue();
        } else {
            doc.autoTable({
                startY: 28,
                head: [['Tanggal', 'Model', 'Varian/Size', 'QTY', 'Platform', 'Omset']],
                body: tableData
            });
            doc.save(`Analisis_Kuantitatif_Clotvers_${getFilterRange()}.pdf`);
        }
    };
}

function downloadPDFRetur() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`CLOTVERS v1.0 - LAPORAN RETUR & BARANG CACAT ${getFilterRange()}`, 14, 20);
    
    let tableData = [];
    const tx = db.transaction('store_retur_reject', 'readonly');
    tx.objectStore('store_retur_reject').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const r = cursor.value;
            if(matchFilterDate(r.tanggal)) {
                tableData.push([r.tanggal, r.jenis, `${r.nama_model} (${r.size})`, r.qty, `Rp ${r.nominal_rugi.toLocaleString()}`, r.keterangan]);
            }
            cursor.continue();
        } else {
            doc.autoTable({
                startY: 28,
                head: [['Tanggal', 'Jenis Klaim', 'Item', 'QTY', 'Kerugian', 'Memo']],
                body: tableData
            });
            doc.save(`Laporan_Retur_Reject_Clotvers_${getFilterRange()}.pdf`);
        }
    };
}

function downloadPDFKeuangan(subType) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`CLOTVERS v1.0 - JURNAL ARUS AKUNTANSI [${subType.toUpperCase()}] ${getFilterRange()}`, 14, 20);
    
    let tableData = [];
    const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
    tx.objectStore('store_jurnal_akuntansi').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const j = cursor.value;
            if(matchFilterDate(j.tanggal)) {
                if(subType === 'omset' && j.tipe_jurnal === 'Pemasukan POS') {
                    tableData.push([j.tanggal, j.klasifikasi_akun, j.keterangan_memo, `Rp ${j.nominal.toLocaleString()}`]);
                } else if(subType === 'pengeluaran' && j.tipe_jurnal === 'Pengeluaran') {
                    tableData.push([j.tanggal, j.klasifikasi_akun, j.keterangan_memo, `Rp ${j.nominal.toLocaleString()}`]);
                } else if(subType === 'pemasukan' && j.tipe_jurnal === 'Pemasukan Lain') {
                    tableData.push([j.tanggal, j.klasifikasi_akun, j.keterangan_memo, `Rp ${j.nominal.toLocaleString()}`]);
                }
            }
            cursor.continue();
        } else {
            doc.autoTable({
                startY: 28,
                head: [['Tanggal', 'Klasifikasi Akun', 'Keterangan Memo', 'Nominal']],
                body: tableData
            });
            doc.save(`Jurnal_Akuntansi_${subType}_Clotvers_${getFilterRange()}.pdf`);
        }
    };
}
