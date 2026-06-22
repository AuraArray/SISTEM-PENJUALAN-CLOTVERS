/**
 * CLOTHVERS SYSTEM v1.0 - CORE ENGINE JS
 * Powered by IndexedDB Architecture & Vanilla Framework 
 */

window.jsPDF = window.jspdf.jsPDF;

// ==========================================================================
// 1. SYSTEM INITIALIZATION & INDEXEDDB ENGINE
// ==========================================================================
let db;
const dbName = "ClothversDB";
const dbVersion = 1;

function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (e) => reject("Gagal membuka database lokal: " + e.target.error);
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains("store_produk")) {
                db.createObjectStore("store_produk", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("store_hpp")) {
                db.createObjectStore("store_hpp", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("store_transaksi")) {
                db.createObjectStore("store_transaksi", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("store_jurnal_akuntansi")) {
                db.createObjectStore("store_jurnal_akuntansi", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("store_retur_reject")) {
                db.createObjectStore("store_retur_reject", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("store_inventaris")) {
                db.createObjectStore("store_inventaris", { keyPath: "id", autoIncrement: true });
            }
        };
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initDatabase().then(() => {
        generateSizeMatrixForm();
        renderAllModulesData();
        initChartPos();
        setDefaultFilterPeriod();
    }).catch(err => alert(err));
});

// Helper Format Rupiah Khas Sistem Keuangan
function formatRupiah(angka) {
    return "Rp " + Number(angka).toLocaleString('id-ID');
}

function setDefaultFilterPeriod() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    document.getElementById("global-filter-periode").value = `2026-${month}`;
}

// ==========================================================================
// 2. LAYOUT SWITCHER & RESPONSIVE DRAWER NAVIGATION
// ==========================================================================
function switchModule(moduleId) {
    document.querySelectorAll('.app-module').forEach(el => el.classList.add('hidden'));
    document.getElementById(`module-${moduleId}`).classList.remove('hidden');

    // Ubah Judul Topbar Secara Dinamis
    const titles = {
        'dashboard-stok': '📦 Master Data Stok Pakaian',
        'dashboard-hpp': '📊 Manajemen HPP & Skema Harga',
        'dashboard-pos': '🛒 Terminal POS Kasir Elektronik',
        'dashboard-retur': '🔄 Log Pengelolaan Retur & Cacat',
        'dashboard-inventaris': '🔧 Manajemen Inventaris Alat & Aset',
        'dashboard-keuangan': '💵 Buku Jurnal Keuangan Akuntansi',
        'dashboard-sync': '⚙️ Cloud Sync Bridge Utility'
    };
    document.getElementById('current-module-title').innerText = titles[moduleId] || 'Clothvers System';

    // Perbarui Tampilan Aktif Navigasi Desktop
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.outerHTML.includes(moduleId)) {
            btn.classList.add('bg-[#396399]', 'text-white');
            btn.classList.remove('text-[#1E293B]', 'hover:bg-gray-200');
        } else {
            btn.classList.remove('bg-[#396399]', 'text-white');
            btn.classList.add('text-[#1E293B]', 'hover:bg-gray-200');
        }
    });

    // Perbarui Tampilan Aktif Navigasi Mobile
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
        if (btn.outerHTML.includes(moduleId)) {
            btn.classList.add('text-[#396399]', 'font-bold');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('text-[#396399]', 'font-bold');
            btn.classList.add('text-gray-400');
        }
    });
}

function toggleDrawer() {
    const drawer = document.getElementById("tablet-drawer");
    drawer.classList.toggle("hidden");
}

function switchKeuanganTab(tabId) {
    if (tabId === 'tab-akumulasi') {
        document.getElementById('sub-tab-akumulasi').classList.remove('hidden');
        document.getElementById('sub-tab-pos-log').classList.add('hidden');
        document.getElementById('btn-tab-akumulasi').className = "border-b-2 border-[#396399] py-2 text-[#396399]";
        document.getElementById('btn-tab-pos-log').className = "border-b-2 border-transparent py-2 text-gray-500 hover:text-gray-700";
    } else {
        document.getElementById('sub-tab-akumulasi').classList.add('hidden');
        document.getElementById('sub-tab-pos-log').classList.remove('hidden');
        document.getElementById('btn-tab-pos-log').className = "border-b-2 border-[#396399] py-2 text-[#396399]";
        document.getElementById('btn-tab-akumulasi').className = "border-b-2 border-transparent py-2 text-gray-500 hover:text-gray-700";
    }
}

function triggerGlobalFilter() {
    renderAllModulesData();
}

function renderAllModulesData() {
    renderStokTable();
    renderHppTable();
    populateDropdowns();
    renderInventarisTable();
    renderJurnalAkumulasi();
    renderPosLogTable();
    renderReturTable();
}

// ==========================================================================
// 3. LOGIKA MODULE A: DASHBOARD STOK PAKAIAN
// ==========================================================================
const availableSizes = ["S", "M", "L", "XL", "2XL"];

function generateSizeMatrixForm() {
    const tbody = document.getElementById("stok-matrix-body");
    tbody.innerHTML = "";
    availableSizes.forEach(size => {
        tbody.innerHTML += `
            <tr data-size="${size}">
                <td class="p-3 font-bold text-[#396399]">${size}</td>
                <td class="p-2"><input type="text" class="m-warna w-full border border-gray-200 rounded p-1" placeholder="Hitam/Putih" value="Hitam"></td>
                <td class="p-2"><input type="number" class="m-stok w-full border border-gray-200 rounded p-1" value="50"></td>
                <td class="p-2"><input type="number" class="m-hpp w-full border border-gray-200 rounded p-1" value="65000"></td>
                <td class="p-2"><input type="number" class="m-jual w-full border border-gray-200 rounded p-1" value="125000"></td>
                <td class="p-2"><input type="number" class="m-wh w-full border border-gray-200 rounded p-1" placeholder="50"></td>
                <td class="p-2"><input type="number" class="m-ht w-full border border-gray-200 rounded p-1" placeholder="70"></td>
                <td class="p-2"><input type="number" class="m-tb w-full border border-gray-200 rounded p-1" placeholder="165"></td>
                <td class="p-2"><input type="number" class="m-bb w-full border border-gray-200 rounded p-1" placeholder="60"></td>
            </tr>
        `;
    });
}

function saveStokData(e) {
    e.preventDefault();
    const id = document.getElementById("stok-edit-id").value;
    const currentPeriode = document.getElementById("global-filter-periode").value;

    const matrix = [];
    document.querySelectorAll("#stok-matrix-body tr").forEach(tr => {
        matrix.push({
            size: tr.dataset.size,
            warna: tr.querySelector(".m-warna").value,
            stok: Number(tr.querySelector(".m-stok").value),
            hpp_varian: Number(tr.querySelector(".m-hpp").value),
            jual_varian: Number(tr.querySelector(".m-jual").value),
            wh: Number(tr.querySelector(".m-wh").value),
            ht: Number(tr.querySelector(".m-ht").value),
            tb: Number(tr.querySelector(".m-tb").value),
            bb_rec: Number(tr.querySelector(".m-bb").value)
        });
    });

    const data = {
        nama_model: document.getElementById("stok-nama-model").value,
        jenis_kain: document.getElementById("stok-jenis-kain").value,
        tipe_kain_gsm: document.getElementById("stok-tipe-gsm").value,
        detail_produksi: document.getElementById("stok-detail-produksi").value,
        matriks_varian: matrix,
        periode: currentPeriode
    };

    const tx = db.transaction("store_produk", "readwrite");
    const store = tx.objectStore("store_produk");
    
    if (id) {
        data.id = Number(id);
        store.put(data);
    } else {
        store.add(data);
    }

    tx.oncomplete = () => {
        resetFormStok();
        renderAllModulesData();
    };
}

function resetFormStok() {
    document.getElementById("stok-edit-id").value = "";
    document.getElementById("form-stok").reset();
    generateSizeMatrixForm();
}

function renderStokTable() {
    const tbody = document.getElementById("table-stok-body");
    tbody.innerHTML = "";
    const filterPeriode = document.getElementById("global-filter-periode").value;

    const tx = db.transaction("store_produk", "readonly");
    tx.objectStore("store_produk").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const val = cursor.value;
            if (val.periode === filterPeriode) {
                let totalStok = val.matriks_varian.reduce((acc, m) => acc + m.stok, 0);
                tbody.innerHTML += `
                    <tr>
                        <td class="p-4 font-bold text-[#1E293B]">${val.nama_model}</td>
                        <td class="p-4 text-xs">${val.jenis_kain} (${val.tipe_kain_gsm})</td>
                        <td class="p-4 text-xs text-gray-500">${val.detail_produksi || '-'}</td>
                        <td class="p-4 text-xs font-semibold">${val.matriks_varian.length} Ukuran / Total: ${totalStok} Pcs</td>
                        <td class="p-4 text-center space-x-2">
                            <button onclick="editStokData(${val.id})" class="text-blue-600 hover:underline font-bold text-xs">Edit</button>
                            <button onclick="deleteData('store_produk', ${val.id}, renderStokTable)" class="text-rose-600 hover:underline font-bold text-xs">Hapus</button>
                        </td>
                    </tr>
                `;
            }
            cursor.continue();
        }
    };
}

function editStokData(id) {
    db.transaction("store_produk", "readonly").objectStore("store_produk").get(id).onsuccess = (e) => {
        const data = e.target.result;
        document.getElementById("stok-edit-id").value = data.id;
        document.getElementById("stok-nama-model").value = data.nama_model;
        document.getElementById("stok-jenis-kain").value = data.jenis_kain;
        document.getElementById("stok-tipe-gsm").value = data.tipe_kain_gsm;
        document.getElementById("stok-detail-produksi").value = data.detail_produksi;

        const tbody = document.getElementById("stok-matrix-body");
        tbody.innerHTML = "";
        data.matriks_varian.forEach(m => {
            tbody.innerHTML += `
                <tr data-size="${m.size}">
                    <td class="p-3 font-bold text-[#396399]">${m.size}</td>
                    <td class="p-2"><input type="text" class="m-warna w-full border border-gray-200 rounded p-1" value="${m.warna}"></td>
                    <td class="p-2"><input type="number" class="m-stok w-full border border-gray-200 rounded p-1" value="${m.stok}"></td>
                    <td class="p-2"><input type="number" class="m-hpp w-full border border-gray-200 rounded p-1" value="${m.hpp_varian}"></td>
                    <td class="p-2"><input type="number" class="m-jual w-full border border-gray-200 rounded p-1" value="${m.jual_varian}"></td>
                    <td class="p-2"><input type="number" class="m-wh w-full border border-gray-200 rounded p-1" value="${m.wh}"></td>
                    <td class="p-2"><input type="number" class="m-ht w-full border border-gray-200 rounded p-1" value="${m.ht}"></td>
                    <td class="p-2"><input type="number" class="m-tb w-full border border-gray-200 rounded p-1" value="${m.tb}"></td>
                    <td class="p-2"><input type="number" class="m-bb w-full border border-gray-200 rounded p-1" value="${m.bb_rec}"></td>
                </tr>
            `;
        });
    };
}

function deleteData(storeName, id, callback) {
    if (confirm("Apakah Anda yakin ingin menghapus data log permanen ini?")) {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => { renderAllModulesData(); };
    }
}

// PDF MASSAL MASTER STOK
function downloadPDFMassalStok() {
    const doc = new doc.jsPDF();
    doc.text("Laporan Massal Master Inventori Stok Pakaian", 14, 15);
    const filterPeriode = document.getElementById("global-filter-periode").value;
    
    const rows = [];
    db.transaction("store_produk", "readonly").objectStore("store_produk").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            if (cursor.value.periode === filterPeriode) {
                cursor.value.matriks_varian.forEach(m => {
                    rows.push([cursor.value.nama_model, m.size, m.warna, m.stok, formatRupiah(m.hpp_varian), formatRupiah(m.jual_varian)]);
                });
            }
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Model Pakaian', 'Size', 'Warna', 'Stok', 'HPP Asli', 'Harga Jual']],
                body: rows,
                startY: 22
            });
            doc.save(`Laporan_Stok_Massal_${filterPeriode}.pdf`);
        }
    };
}

// ==========================================================================
// 4. LOGIKA MODULE B: DASHBOARD MANAJEMEN HPP
// ==========================================================================
let currentProductsCache = [];

function populateDropdowns() {
    const pSelect = document.getElementById("hpp-select-model");
    const posSelect = document.getElementById("pos-select-produk");
    const returSelect = document.getElementById("retur-select-model");
    
    pSelect.innerHTML = "<option value=''>-- Pilih Model --</option>";
    posSelect.innerHTML = "<option value=''>-- Pilih Model --</option>";
    returSelect.innerHTML = "<option value=''>-- Pilih Model --</option>";
    
    currentProductsCache = [];
    const filterPeriode = document.getElementById("global-filter-periode").value;

    db.transaction("store_produk", "readonly").objectStore("store_produk").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            if (cursor.value.periode === filterPeriode) {
                currentProductsCache.push(cursor.value);
                const opt = `<option value="${cursor.value.nama_model}">${cursor.value.nama_model}</option>`;
                pSelect.innerHTML += opt;
                posSelect.innerHTML += opt;
                returSelect.innerHTML += opt;
            }
            cursor.continue();
        }
    };
}

function syncHppFabricCost() {
    const modelName = document.getElementById("hpp-select-model").value;
    const selectedSize = document.getElementById("hpp-select-size").value;
    const costInput = document.getElementById("hpp-biaya-kain");

    if (!modelName) { costInput.value = 0; return; }

    const product = currentProductsCache.find(p => p.nama_model === modelName);
    if (product) {
        const variant = product.matriks_varian.find(m => m.size === selectedSize);
        costInput.value = variant ? variant.hpp_varian : 0;
    }
    calculateHppTotal();
}

function calculateHppTotal() {
    const kain = Number(document.getElementById("hpp-biaya-kain").value) || 0;
    const jahit = Number(document.getElementById("hpp-ongkos-jahit").value) || 0;
    const sablon = Number(document.getElementById("hpp-aplikasi-sablon").value) || 0;
    const pack = Number(document.getElementById("hpp-packaging").value) || 0;
    const marginPercent = Number(document.getElementById("hpp-margin-percent").value) || 0;

    const hppTotal = kain + jahit + sablon + pack;
    document.getElementById("hpp-total-display").value = formatRupiah(hppTotal);

    // Hitung Simulasi Multi-Channel Berdasarkan Aturan Finansial
    const baseJual = hppTotal * (1 + (marginPercent / 100));
    
    document.getElementById("price-wa").innerText = formatRupiah(baseJual);
    document.getElementById("price-shopee").innerText = formatRupiah(baseJual / (1 - 0.06));
    document.getElementById("price-tiktok").innerText = formatRupiah(baseJual / (1 - 0.085));
    document.getElementById("price-reseller").innerText = formatRupiah(baseJual * 0.85);
    document.getElementById("price-grosir").innerText = formatRupiah(baseJual * 0.75);
}

function saveHppData(e) {
    e.preventDefault();
    const id = document.getElementById("hpp-edit-id").value;
    const filterPeriode = document.getElementById("global-filter-periode").value;
    const hppTotal = Number(document.getElementById("hpp-biaya-kain").value) +
                      Number(document.getElementById("hpp-ongkos-jahit").value) +
                      Number(document.getElementById("hpp-aplikasi-sablon").value) +
                      Number(document.getElementById("hpp-packaging").value);
    const margin = Number(document.getElementById("hpp-margin-percent").value);
    const baseJual = hppTotal * (1 + (margin / 100));

    const data = {
        nama_model: document.getElementById("hpp-select-model").value,
        size_terpilih: document.getElementById("hpp-select-size").value,
        biaya_kain_otomatis: Number(document.getElementById("hpp-biaya-kain").value),
        ongkos_jahit: Number(document.getElementById("hpp-ongkos-jahit").value),
        aplikasi_sablon: Number(document.getElementById("hpp-aplikasi-sablon").value),
        packaging: Number(document.getElementById("hpp-packaging").value),
        margin_percent: margin,
        hpp_total: hppTotal,
        periode: filterPeriode,
        channels: {
            wa: baseJual,
            shopee: baseJual / (1 - 0.06),
            tiktok: baseJual / (1 - 0.085),
            reseller: baseJual * 0.85,
            grosir: baseJual * 0.75
        }
    };

    const tx = db.transaction("store_hpp", "readwrite");
    if (id) { data.id = Number(id); tx.objectStore("store_hpp").put(data); }
    else { tx.objectStore("store_hpp").add(data); }

    tx.oncomplete = () => { resetFormHpp(); renderHppTable(); };
}

function resetFormHpp() {
    document.getElementById("hpp-edit-id").value = "";
    document.getElementById("form-hpp").reset();
    calculateHppTotal();
}

function renderHppTable() {
    const tbody = document.getElementById("table-hpp-body");
    tbody.innerHTML = "";
    const filterPeriode = document.getElementById("global-filter-periode").value;

    db.transaction("store_hpp", "readonly").objectStore("store_hpp").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const v = cursor.value;
            if (v.periode === filterPeriode) {
                tbody.innerHTML += `
                    <tr>
                        <td class="p-4 font-bold text-[#1E293B]">${v.nama_model} <span class="text-xs text-blue-600">[Size ${v.size_terpilih}]</span></td>
                        <td class="p-4 text-xs text-gray-500">Kain: ${v.biaya_kain_otomatis} | Jahit: ${v.ongkos_jahit} | Sablon: ${v.aplikasi_sablon} | Pack: ${v.packaging}</td>
                        <td class="p-4 font-bold text-red-600">${formatRupiah(v.hpp_total)} <span class="text-xs text-gray-400">(${v.margin_percent}%)</span></td>
                        <td class="p-4 text-xs space-y-0.5">
                            <div>Offline: <b>${formatRupiah(v.channels.wa)}</b></div>
                            <div>Shopee: <b>${formatRupiah(v.channels.shopee)}</b></div>
                            <div>TikTok: <b>${formatRupiah(v.channels.tiktok)}</b></div>
                        </td>
                        <td class="p-4 text-center space-x-2">
                            <button onclick="editHppData(${v.id})" class="text-blue-600 hover:underline text-xs font-bold">Edit</button>
                            <button onclick="deleteData('store_hpp', ${v.id}, renderHppTable)" class="text-rose-600 hover:underline text-xs font-bold">Hapus</button>
                        </td>
                    </tr>
                `;
            }
            cursor.continue();
        }
    };
}

function editHppData(id) {
    db.transaction("store_hpp", "readonly").objectStore("store_hpp").get(id).onsuccess = (e) => {
        const d = e.target.result;
        document.getElementById("hpp-edit-id").value = d.id;
        document.getElementById("hpp-select-model").value = d.nama_model;
        document.getElementById("hpp-select-size").value = d.size_terpilih;
        document.getElementById("hpp-biaya-kain").value = d.biaya_kain_otomatis;
        document.getElementById("hpp-ongkos-jahit").value = d.ongkos_jahit;
        document.getElementById("hpp-aplikasi-sablon").value = d.aplikasi_sablon;
        document.getElementById("hpp-packaging").value = d.packaging;
        document.getElementById("hpp-margin-percent").value = d.margin_percent;
        calculateHppTotal();
    };
}

function downloadPDFMassalHpp() {
    const doc = new doc.jsPDF();
    doc.text("Laporan Strategis Skema Pengupahan & HPP Total", 14, 15);
    const filterPeriode = document.getElementById("global-filter-periode").value;
    const rows = [];

    db.transaction("store_hpp", "readonly").objectStore("store_hpp").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            if (cursor.value.periode === filterPeriode) {
                const v = cursor.value;
                rows.push([v.nama_model, v.size_terpilih, formatRupiah(v.hpp_total), `${v.margin_percent}%`, formatRupiah(v.channels.wa), formatRupiah(v.channels.shopee)]);
            }
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Model Pakaian', 'Size', 'HPP Total', 'Margin %', 'Harga WA', 'Harga Shopee']],
                body: rows,
                startY: 22
            });
            doc.save(`Laporan_HPP_Massal_${filterPeriode}.pdf`);
        }
    };
}

// ==========================================================================
// 5. TERMINAL KASIR (POS), KANVAS GRAFIK & MODUL RETUR
// ==========================================================================
let posCart = [];
let channelChartInstance;

function updatePosSizeDropdown() {
    const modelName = document.getElementById("pos-select-produk").value;
    const sizeSelect = document.getElementById("pos-select-size");
    sizeSelect.innerHTML = "";
    
    const product = currentProductsCache.find(p => p.nama_model === modelName);
    if(product) {
        product.matriks_varian.forEach(m => {
            sizeSelect.innerHTML += `<option value="${m.size}">${m.size}</option>`;
        });
    }
    updatePosPriceDisplay();
}

function updatePosPriceDisplay() {
    const modelName = document.getElementById("pos-select-produk").value;
    const size = document.getElementById("pos-select-size").value;
    const channel = document.getElementById("pos-channel").value;
    const priceTag = document.getElementById("pos-price-tag");

    if(!modelName || !size) { priceTag.innerText = "Rp 0"; return; }

    // Ambil harga dinamis dari tabel HPP yang terdaftar
    const filterPeriode = document.getElementById("global-filter-periode").value;
    let foundPrice = 0;

    db.transaction("store_hpp", "readonly").objectStore("store_hpp").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.nama_model === modelName && v.size_terpilih === size && v.periode === filterPeriode) {
                foundPrice = v.channels[channel];
            }
            cursor.continue();
        } else {
            if(foundPrice === 0) {
                // Fallback ke harga jual kasar di modul stok jika HPP skema belum dikunci
                const prod = currentProductsCache.find(p => p.nama_model === modelName);
                if(prod) {
                    const vr = prod.matriks_varian.find(m => m.size === size);
                    if(vr) foundPrice = vr.jual_varian;
                }
            }
            priceTag.innerText = formatRupiah(foundPrice);
            priceTag.dataset.rawPrice = foundPrice;
        }
    };
}

function addToCartPos() {
    const model = document.getElementById("pos-select-produk").value;
    const size = document.getElementById("pos-select-size").value;
    const channel = document.getElementById("pos-channel").value;
    const qty = Number(document.getElementById("pos-qty").value) || 1;
    const price = Number(document.getElementById("pos-price-tag").dataset.rawPrice) || 0;

    if(!model || !size) return;

    posCart.push({ model, size, channel, qty, price, subtotal: price * qty });
    renderPosCart();
}

function renderPosCart() {
    const tbody = document.getElementById("pos-cart-body");
    if(posCart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">Keranjang kosong.</td></tr>`;
        document.getElementById("pos-total-belanja").innerText = "Rp 0";
        return;
    }
    tbody.innerHTML = "";
    let total = 0;
    posCart.forEach((item, idx) => {
        total += item.subtotal;
        tbody.innerHTML += `
            <tr>
                <td class="p-3 font-semibold">${item.model} (${item.size})</td>
                <td class="p-3 uppercase text-xs">${item.channel}</td>
                <td class="p-3 text-right">${formatRupiah(item.price)}</td>
                <td class="p-3 text-center font-bold">${item.qty}</td>
                <td class="p-3 text-right font-bold text-[#396399]">${formatRupiah(item.subtotal)}</td>
                <td class="p-3 text-center"><button onclick="posCart.splice(${idx},1); renderPosCart();" class="text-rose-600 hover:underline">Batal</button></td>
            </tr>
        `;
    });
    document.getElementById("pos-total-belanja").innerText = formatRupiah(total);
    document.getElementById("pos-total-belanja").dataset.total = total;
    calculatePosKembalian();
}

function calculatePosKembalian() {
    const total = Number(document.getElementById("pos-total-belanja").dataset.total) || 0;
    const bayar = Number(document.getElementById("pos-bayar").value) || 0;

    if(bayar >= total) {
        document.getElementById("pos-kembalian").innerText = formatRupiah(bayar - total);
        document.getElementById("pos-sisa-tagihan").innerText = "Rp 0";
    } else {
        document.getElementById("pos-kembalian").innerText = "Rp 0";
        document.getElementById("pos-sisa-tagihan").innerText = formatRupiah(total - bayar);
    }
}

function checkoutPos() {
    if(posCart.length === 0) return;
    const total = Number(document.getElementById("pos-total-belanja").dataset.total);
    const bayar = Number(document.getElementById("pos-bayar").value) || 0;
    const filterPeriode = document.getElementById("global-filter-periode").value;

    const sisa = bayar >= total ? 0 : total - bayar;

    const trxData = {
        waktu: new Date().toISOString(),
        items: posCart,
        total_transaksi: total,
        dibayar: bayar,
        sisa_tagihan: sisa,
        periode: filterPeriode
    };

    const tx = db.transaction(["store_transaksi", "store_jurnal_akuntansi"], "readwrite");
    tx.objectStore("store_transaksi").add(trxData);

    // Otomatis inject post ke Buku Laporan Akumulasi Akuntansi Keuangan
    tx.objectStore("store_jurnal_akuntansi").add({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: `Penjualan POS POS Kasir (${posCart.length} Item)`,
        jenis: "Masuk",
        nominal: bayar, // Kas riil yang diterima masuk dompet
        periode: filterPeriode
    });

    tx.oncomplete = () => {
        alert("Nota Transaksi Berhasil Dikunci!");
        posCart = [];
        document.getElementById("pos-bayar").value = "";
        renderPosCart();
        renderAllModulesData();
    };
}

function initChartPos() {
    const ctx = document.getElementById('chart-pos-channels').getContext('2d');
    channelChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['WhatsApp', 'Shopee', 'TikTok', 'Reseller', 'Grosir'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#396399', '#f97316', '#000000', '#a855f7', '#ec4899']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
    updateChartData();
}

function updateChartData() {
    if(!channelChartInstance) return;
    const filterPeriode = document.getElementById("global-filter-periode").value;
    let counts = { wa: 0, shopee: 0, tiktok: 0, reseller: 0, grosir: 0 };

    db.transaction("store_transaksi", "readonly").objectStore("store_transaksi").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            if(cursor.value.periode === filterPeriode) {
                cursor.value.items.forEach(item => {
                    if(counts[item.channel] !== undefined) counts[item.channel] += item.qty;
                });
            }
            cursor.continue();
        } else {
            channelChartInstance.data.datasets[0].data = [counts.wa, counts.shopee, counts.tiktok, counts.reseller, counts.grosir];
            channelChartInstance.update();
        }
    };
}

function renderPosLogTable() {
    const tbody = document.getElementById("table-pos-log-body");
    tbody.innerHTML = "";
    const filterPeriode = document.getElementById("global-filter-periode").value;

    db.transaction("store_transaksi", "readonly").objectStore("store_transaksi").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.periode === filterPeriode) {
                let itemsDesc = v.items.map(i => `${i.model} (${i.size}) x${i.qty}`).join(', ');
                tbody.innerHTML += `
                    <tr>
                        <td class="p-4 font-mono text-xs">#TRX-${v.id}</td>
                        <td class="p-4 text-xs">${v.waktu.replace('T', ' ').substring(0,16)}</td>
                        <td class="p-4 text-xs text-gray-600 max-w-xs truncate">${itemsDesc}</td>
                        <td class="p-4 text-right font-semibold">${formatRupiah(v.total_transaksi)}</td>
                        <td class="p-4 text-right text-emerald-600 font-bold">${formatRupiah(v.dibayar)}</td>
                        <td class="p-4 text-right text-rose-500 font-bold">${formatRupiah(v.sisa_tagihan)}</td>
                        <td class="p-4 text-center"><button onclick="deleteData('store_transaksi', ${v.id}, renderPosLogTable)" class="text-rose-600 text-xs font-bold hover:underline">Hapus</button></td>
                    </tr>
                `;
            }
            cursor.continue();
        }
        updateChartData();
    };
}

// MODUL RETUR LOGIKA
function saveReturData(e) {
    e.preventDefault();
    const filterPeriode = document.getElementById("global-filter-periode").value;
    const data = {
        tanggal: new Date().toISOString().split('T')[0],
        nama_model: document.getElementById("retur-select-model").value,
        jenis: document.getElementById("retur-jenis").value,
        qty: Number(document.getElementById("retur-qty").value),
        kerugian: Number(document.getElementById("retur-kerugian").value) || 0,
        keterangan: document.getElementById("retur-keterangan").value,
        periode: filterPeriode
    };

    const tx = db.transaction(["store_retur_reject", "store_jurnal_akuntansi"], "readwrite");
    tx.objectStore("store_retur_reject").add(data);
    
    if (data.kerugian > 0) {
        tx.objectStore("store_jurnal_akuntansi").add({
            tanggal: data.tanggal,
            keterangan: `Rugi Reject Cacat Produksi: ${data.nama_model}`,
            jenis: "Keluar",
            nominal: data.kerugian,
            periode: filterPeriode
        });
    }

    tx.oncomplete = () => {
        document.getElementById("form-retur").reset();
        renderAllModulesData();
    };
}

function renderReturTable() {
    const tbody = document.getElementById("table-retur-body");
    tbody.innerHTML = "";
    const filterPeriode = document.getElementById("global-filter-periode").value;

    db.transaction("store_retur_reject", "readonly").objectStore("store_retur_reject").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            if(cursor.value.periode === filterPeriode) {
                const v = cursor.value;
                tbody.innerHTML += `
                    <tr>
                        <td class="p-4 text-xs">${v.tanggal}</td>
                        <td class="p-4 font-bold text-xs">${v.nama_model}</td>
                        <td class="p-4 text-xs"><span class="px-2 py-0.5 rounded-full ${v.jenis === 'Tukar Size' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}">${v.jenis}</span></td>
                        <td class="p-4 text-xs font-bold">${v.qty} Pcs</td>
                        <td class="p-4 text-xs font-semibold text-rose-600">${formatRupiah(v.kerugian)}</td>
                        <td class="p-4 text-xs text-gray-500">${v.keterangan}</td>
                        <td class="p-4 text-center"><button onclick="deleteData('store_retur_reject', ${v.id}, renderReturTable)" class="text-rose-600 text-xs font-bold hover:underline">Hapus</button></td>
                    </tr>
                `;
            }
            cursor.continue();
        }
    };
}

// ==========================================================================
// 6. LOGIKA MODULE D: MANAGEMENT INVENTARIS ALAT
// ==========================================================================
function saveInventarisData(e) {
    e.preventDefault();
    const id = document.getElementById("inventaris-edit-id").value;
    const filterPeriode = document.getElementById("global-filter-periode").value;
    const qty = Number(document.getElementById("inventaris-qty").value);
    const harga = Number(document.getElementById("inventaris-harga").value);
    const penyusutanBulan = Number(document.getElementById("inventaris-penyusutan-bulan").value) || 1;

    const data = {
        tanggal_beli: document.getElementById("inventaris-tanggal").value,
        nama_alat: document.getElementById("inventaris-nama-alat").value,
        kategori: document.getElementById("inventaris-kategori").value,
        kuantitas: qty,
        harga_satuan: harga,
        total_nilai: qty * harga,
        masa_habis_pakai_bulan: penyusutanBulan,
        periode: filterPeriode
    };

    const tx = db.transaction(["store_inventaris", "store_jurnal_akuntansi"], "readwrite");
    const store = tx.objectStore("store_inventaris");

    if(id) {
        data.id = Number(id);
        store.put(data);
    } else {
        store.add(data);
        // Otomatis catat beban pembelian modal di jurnal finansial
        tx.objectStore("store_jurnal_akuntansi").add({
            tanggal: data.tanggal_beli,
            keterangan: `Pembelian Inventaris: ${data.nama_alat}`,
            jenis: "Keluar",
            nominal: data.total_nilai,
            periode: filterPeriode
        });
        // Catat Amortisasi Biaya Bulanan Pertama
        tx.objectStore("store_jurnal_akuntansi").add({
            tanggal: data.tanggal_beli,
            keterangan: `Amortisasi Penyusutan Bulanan: ${data.nama_alat}`,
            jenis: "Keluar",
            nominal: data.total_nilai / penyusutanBulan,
            periode: filterPeriode
        });
    }

    tx.oncomplete = () => { resetFormInventaris(); renderAllModulesData(); };
}

function resetFormInventaris() {
    document.getElementById("inventaris-edit-id").value = "";
    document.getElementById("form-inventaris").reset();
}

function renderInventarisTable() {
    const tbody = document.getElementById("table-inventaris-body");
    tbody.innerHTML = "";
    const filterPeriode = document.getElementById("global-filter-periode").value;

    db.transaction("store_inventaris", "readonly").objectStore("store_inventaris").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            if(v.periode === filterPeriode) {
                const susutBulan = v.total_nilai / v.masa_habis_pakai_bulan;
                tbody.innerHTML += `
                    <tr>
                        <td class="p-4 text-xs">${v.tanggal_beli}</td>
                        <td class="p-4 font-bold text-xs text-[#1E293B]">${v.nama_alat}</td>
                        <td class="p-4 text-xs text-gray-500">${v.kategori}</td>
                        <td class="p-4 text-xs">${v.kuantitas} x ${formatRupiah(v.harga_satuan)}</td>
                        <td class="p-4 font-bold text-xs">${formatRupiah(v.total_nilai)}</td>
                        <td class="p-4 text-xs text-rose-600 font-semibold">${formatRupiah(susutBulan)}/bln <span class="text-[10px] text-gray-400">(${v.masa_habis_pakai_bulan} M)</span></td>
                        <td class="p-4 text-center space-x-2">
                            <button onclick="editInventarisData(${v.id})" class="text-blue-600 text-xs font-bold hover:underline">Edit</button>
                            <button onclick="deleteData('store_inventaris', ${v.id}, renderInventarisTable)" class="text-rose-600 text-xs font-bold hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            }
            cursor.continue();
        }
    };
}

function editInventarisData(id) {
    db.transaction("store_inventaris", "readonly").objectStore("store_inventaris").get(id).onsuccess = (e) => {
        const d = e.target.result;
        document.getElementById("inventaris-edit-id").value = d.id;
        document.getElementById("inventaris-tanggal").value = d.tanggal_beli;
        document.getElementById("inventaris-nama-alat").value = d.nama_alat;
        document.getElementById("inventaris-kategori").value = d.kategori;
        document.getElementById("inventaris-qty").value = d.kuantitas;
        document.getElementById("inventaris-harga").value = d.harga_satuan;
        document.getElementById("inventaris-penyusutan-bulan").value = d.masa_habis_pakai_bulan;
    };
}

function downloadPDFMassalInventaris() {
    const doc = new doc.jsPDF();
    doc.text("Laporan Kapitalisasi Inventaris & Amortisasi Aset", 14, 15);
    const filterPeriode = document.getElementById("global-filter-periode").value;
    const rows = [];

    db.transaction("store_inventaris", "readonly").objectStore("store_inventaris").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            if(cursor.value.periode === filterPeriode) {
                const v = cursor.value;
                rows.push([v.tanggal_beli, v.nama_alat, v.kategori, v.kuantitas, formatRupiah(v.total_nilai), formatRupiah(v.total_nilai/v.masa_habis_pakai_bulan)]);
            }
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Tanggal Beli', 'Nama Alat', 'Kategori', 'Qty', 'Total Nilai', 'Penyusutan/Bln']],
                body: rows,
                startY: 22
            });
            doc.save(`Laporan_Inventaris_${filterPeriode}.pdf`);
        }
    };
}

// ==========================================================================
// 7. MODULE E: BUKU LAPORAN AKUMULASI JURNAL KRONOLOGIS (GENERAL LEDGER)
// ==========================================================================
function saveJurnalManual(e) {
    e.preventDefault();
    const filterPeriode = document.getElementById("global-filter-periode").value;
    const data = {
        tanggal: document.getElementById("jurnal-tanggal").value,
        keterangan: document.getElementById("jurnal-keterangan").value,
        jenis: document.getElementById("jurnal-jenis").value,
        nominal: Number(document.getElementById("jurnal-nominal").value),
        periode: filterPeriode
    };

    const tx = db.transaction("store_jurnal_akuntansi", "readwrite");
    tx.objectStore("store_jurnal_akuntansi").add(data);
    tx.oncomplete = () => {
        document.getElementById("form-jurnal").reset();
        renderJurnalAkumulasi();
    };
}

function renderJurnalAkumulasi() {
    const tbody = document.getElementById("table-jurnal-body");
    tbody.innerHTML = "";
    
    const globalPeriode = document.getElementById("global-filter-periode").value;
    const timeFilter = document.getElementById("jurnal-filter-time").value;
    const todayStr = new Date().toISOString().split('T')[0];

    db.transaction("store_jurnal_akuntansi", "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            let pass = false;

            if (timeFilter === 'all') pass = true;
            else if (timeFilter === 'month' && v.periode === globalPeriode) pass = true;
            else if (timeFilter === 'day' && v.tanggal === todayStr) pass = true;
            else if (timeFilter === 'week') {
                const diffTime = Math.abs(new Date(todayStr) - new Date(v.tanggal));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if(diffDays <= 7) pass = true;
            }

            if(pass) {
                tbody.innerHTML += `
                    <tr>
                        <td class="p-4 text-xs font-mono">${v.tanggal}</td>
                        <td class="p-4 text-xs font-bold text-gray-700">${v.keterangan}</td>
                        <td class="p-4 text-xs"><span class="px-2 py-0.5 rounded text-[11px] font-bold ${v.jenis === 'Masuk' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${v.jenis.toUpperCase()}</span></td>
                        <td class="p-4 text-right text-xs font-semibold text-emerald-600">${v.jenis === 'Masuk' ? formatRupiah(v.nominal) : '-'}</td>
                        <td class="p-4 text-right text-xs font-semibold text-rose-600">${v.jenis === 'Keluar' ? formatRupiah(v.nominal) : '-'}</td>
                        <td class="p-4 text-center"><button onclick="deleteData('store_jurnal_akuntansi', ${v.id}, renderJurnalAkumulasi)" class="text-rose-500 text-xs font-bold hover:underline">Hapus</button></td>
                    </tr>
                `;
            }
            cursor.continue();
        }
    };
}

function downloadPDFAkumulasiJurnal() {
    const doc = new doc.jsPDF();
    doc.text("Buku Besar Laporan Akumulasi Jurnal Keuangan", 14, 15);
    const rows = [];

    db.transaction("store_jurnal_akuntansi", "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            rows.push([v.tanggal, v.keterangan, v.jenis.toUpperCase(), v.jenis === 'Masuk' ? formatRupiah(v.nominal) : '-', v.jenis === 'Keluar' ? formatRupiah(v.nominal) : '-']);
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Tanggal', 'Keterangan Transaksi', 'Arus', 'Debit (Masuk)', 'Kredit (Keluar)']],
                body: rows,
                startY: 22
            });
            doc.save("Jurnal_Akumulasi_Buku_Besar.pdf");
        }
    };
}

function downloadCSVAkumulasiJurnal() {
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Keterangan,Arus,Debit,Kredit\n";
    
    db.transaction("store_jurnal_akuntansi", "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if(cursor) {
            const v = cursor.value;
            let row = `${v.tanggal},"${v.keterangan}",${v.jenis},${v.jenis === 'Masuk' ? v.nominal : 0},${v.jenis === 'Keluar' ? v.nominal : 0}\n`;
            csvContent += row;
            cursor.continue();
        } else {
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "Jurnal_Akumulasi_Finansial.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
}

// ==========================================================================
// 8. DATABASE SYNC BRIDGE INTER-DEVICE BACKUP ENGINE (JSON PROCESSED)
// ==========================================================================
function backupDatabaseJSON() {
    const backupData = {};
    const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject", "store_inventaris"];
    let completed = 0;

    stores.forEach(sName => {
        backupData[sName] = [];
        db.transaction(sName, "readonly").objectStore(sName).getAll().onsuccess = (e) => {
            backupData[sName] = e.target.result;
            completed++;
            if(completed === stores.length) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                const dlAnchor = document.createElement('a');
                dlAnchor.setAttribute("href", dataStr);
                dlAnchor.setAttribute("download", `ClothversDB_Backup_2026.json`);
                document.body.appendChild(dlAnchor);
                dlAnchor.click();
                dlAnchor.remove();
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
            const importedData = JSON.parse(e.target.result);
            const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject", "store_inventaris"];
            
            const tx = db.transaction(stores, "readwrite");
            stores.forEach(sName => {
                if(importedData[sName]) {
                    const store = tx.objectStore(sName);
                    store.clear();
                    importedData[sName].forEach(item => {
                        // Hilangkan key id agar autoIncrement memproses ulang id secara teratur
                        delete item.id; 
                        store.add(item);
                    });
                }
            });

            tx.oncomplete = () => {
                alert("Sinkronisasi Backup Multi-Device Sukses Di-import!");
                renderAllModulesData();
            };
        } catch (err) {
            alert("File JSON korup atau tidak valid: " + err);
        }
    };
    reader.readAsText(file);
}
