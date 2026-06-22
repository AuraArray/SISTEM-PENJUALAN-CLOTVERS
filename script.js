/**
 * CLOTHVERS SYSTEM V1.0 - CORE ENGINE LOGIC
 * Powered by IndexedDB Local Database & jsPDF Plugins
 */

let db;
const DB_NAME = "ClothversDB";
const DB_VERSION = 1;

// List Ukuran Konveksi
const SIZES = ["S", "M", "L", "XL", "2XL"];

// Inisialisasi Aplikasi Saat DOM Siap
document.addEventListener("DOMContentLoaded", () => {
    initIndexedDB();
    generateMatriksSizeForm();
    setupGlobalFilters();
});

// Setup Filter Global Event Listener
function setupGlobalFilters() {
    const d = new Date();
    document.getElementById("global-bulan").value = String(d.getMonth() + 1).padStart(2, '0');
    document.getElementById("global-tahun").value = "2026";

    document.getElementById("global-bulan").addEventListener("change", refreshAllViews);
    document.getElementById("global-tahun").addEventListener("change", refreshAllViews);
}

function refreshAllViews() {
    renderTabelStok();
    renderTabelHPP();
    loadDropdownProduk();
    renderLogPOS();
    renderTabelRetur();
    renderTabelInventaris();
    renderBukuAkumulasi();
}

// -------------------------------------------------------------------------
// CORE ENGINE: DATABASE LOKAL (IndexedDB Engine)
// -------------------------------------------------------------------------
function initIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => console.error("IndexedDB Error:", e);
    request.onsuccess = (e) => {
        db = e.target.result;
        refreshAllViews();
    };

    request.onupgradeneeded = (e) => {
        const localDb = e.target.result;
        
        if (!localDb.objectStoreNames.contains("store_produk")) {
            localDb.createObjectStore("store_produk", { keyPath: "id", autoIncrement: true });
        }
        if (!localDb.objectStoreNames.contains("store_hpp")) {
            localDb.createObjectStore("store_hpp", { keyPath: "id", autoIncrement: true });
        }
        if (!localDb.objectStoreNames.contains("store_transaksi")) {
            localDb.createObjectStore("store_transaksi", { keyPath: "id", autoIncrement: true });
        }
        if (!localDb.objectStoreNames.contains("store_jurnal_akuntansi")) {
            localDb.createObjectStore("store_jurnal_akuntansi", { keyPath: "id", autoIncrement: true });
        }
        if (!localDb.objectStoreNames.contains("store_retur_reject")) {
            localDb.createObjectStore("store_retur_reject", { keyPath: "id", autoIncrement: true });
        }
        if (!localDb.objectStoreNames.contains("store_inventaris")) {
            localDb.createObjectStore("store_inventaris", { keyPath: "id", autoIncrement: true });
        }
    };
}

// Helper Transaksi IndexedDB Generic
function getStore(storeName, mode = "readonly") {
    return db.transaction(storeName, mode).objectStore(storeName);
}

// -------------------------------------------------------------------------
// UTILITY: MANAJEMEN MODUL & LAYOUT VIEW
// -------------------------------------------------------------------------
function switchModule(moduleId) {
    document.querySelectorAll(".modul-content").forEach(el => el.classList.add("hidden"));
    document.getElementById(`modul-${moduleId}`).classList.remove("hidden");

    // Efek Active Sidebar
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("bg-[#396399]", "text-white");
        btn.classList.add("text-[#1E293B]", "hover:bg-gray-200/60");
    });
    const clickedBtn = event.currentTarget;
    clickedBtn.classList.remove("text-[#1E293B]", "hover:bg-gray-200/60");
    clickedBtn.classList.add("bg-[#396399]", "text-white");

    // Update Title Topbar
    const titleMap = {
        stok: "Master Stok Pakaian",
        hpp: "Manajemen HPP",
        pos: "Terminal POS Kasir",
        retur: "Retur & Barang Cacat",
        inventaris: "Inventaris Alat Kerja",
        keuangan: "Akuntansi & Keuangan",
        sync: "Backup & Sync Bridge"
    };
    document.getElementById("module-title").innerText = titleMap[moduleId];
    refreshAllViews();
}

function switchSubKeuangan(subId) {
    document.querySelectorAll(".sub-keuangan-content").forEach(el => el.classList.add("hidden"));
    document.getElementById(`sub-${subId}`).classList.remove("hidden");

    document.querySelectorAll(".sub-keuangan-btn").forEach(btn => {
        btn.classList.remove("bg-[#396399]", "text-white");
        btn.classList.add("text-gray-500", "hover:bg-gray-100");
    });
    event.currentTarget.classList.remove("text-gray-500", "hover:bg-gray-100");
    event.currentTarget.classList.add("bg-[#396399]", "text-white");
}

// -------------------------------------------------------------------------
// MODUL A: MASTER STOK PAKAIAN (LOGIC & INTERACTION)
// -------------------------------------------------------------------------
function generateMatriksSizeForm() {
    const tbody = document.getElementById("matriks-size-body");
    tbody.innerHTML = "";
    SIZES.forEach(size => {
        tbody.innerHTML += `
            <tr data-size="${size}">
                <td class="py-2 font-bold text-[#0F172A]">${size}</td>
                <td class="py-2"><input type="text" class="size-warna border border-gray-200 rounded-lg p-1 text-xs w-24" placeholder="Hitam" required></td>
                <td class="py-2"><input type="number" class="size-stok border border-gray-200 rounded-lg p-1 text-xs w-20" value="0" min="0" required></td>
                <td class="py-2"><input type="number" class="size-hpp border border-gray-200 rounded-lg p-1 text-xs w-24" value="0" min="0" required></td>
                <td class="py-2"><input type="number" class="size-jual border border-gray-200 rounded-lg p-1 text-xs w-24" value="0" min="0" required></td>
                <td class="py-2"><input type="text" class="size-wh border border-gray-200 rounded-lg p-1 text-xs w-16" placeholder="50"></td>
                <td class="py-2"><input type="text" class="size-ht border border-gray-200 rounded-lg p-1 text-xs w-16" placeholder="70"></td>
                <td class="py-2"><input type="text" class="size-rec border border-gray-200 rounded-lg p-1 text-xs w-24" placeholder="165cm / 60kg"></td>
            </tr>
        `;
    });
}

document.getElementById("form-stok").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("stok-id").value;
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    const matriksVarian = [];
    document.querySelectorAll("#matriks-size-body tr").forEach(row => {
        matriksVarian.push({
            size: row.dataset.size,
            warna: row.querySelector(".size-warna").value,
            stok: parseInt(row.querySelector(".size-stok").value) || 0,
            hpp_varian: parseFloat(row.querySelector(".size-hpp").value) || 0,
            jual_varian: parseFloat(row.querySelector(".size-jual").value) || 0,
            wh: row.querySelector(".size-wh").value,
            ht: row.querySelector(".size-ht").value,
            bb_rec: row.querySelector(".size-rec").value
        });
    });

    const dataProduk = {
        nama_model: document.getElementById("stok-nama").value,
        jenis_kain: document.getElementById("stok-kain").value,
        tipe_kain_gsm: document.getElementById("stok-gsm").value,
        detail_production: document.getElementById("stok-detail").value,
        matriks_varian: matriksVarian,
        periode: currentPeriode
    };

    const store = getStore("store_produk", "readwrite");
    let req;
    if (id) {
        dataProduk.id = parseInt(id);
        req = store.put(dataProduk);
    } else {
        req = store.add(dataProduk);
    }

    req.onsuccess = () => {
        resetFormStok();
        refreshAllViews();
    };
});

function resetFormStok() {
    document.getElementById("stok-id").value = "";
    document.getElementById("form-stok").reset();
    generateMatriksSizeForm();
}

function renderTabelStok() {
    const tbody = document.getElementById("tabel-stok-body");
    tbody.innerHTML = "";
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    getStore("store_produk").getAll().onsuccess = (e) => {
        const listData = e.target.result.filter(p => p.periode === currentPeriode);
        listData.forEach(p => {
            let totalStok = p.matriks_varian.reduce((acc, curr) => acc + curr.stok, 0);
            let varianHTML = p.matriks_varian.map(v => 
                `<span class="inline-block bg-gray-100 border border-gray-200 text-xs text-[#1E293B] rounded px-1.5 py-0.5 m-0.5">
                    <b>${v.size}</b> (${v.warna}): S:${v.stok} | Hpp:Rp${v.hpp_varian.toLocaleString()}
                </span>`
            ).join(" ");

            tbody.innerHTML += `
                <tr>
                    <td class="p-4 font-bold text-[#0F172A]">
                        ${p.nama_model}<br>
                        <span class="text-xs text-gray-500 font-normal">${p.jenis_kain} - ${p.tipe_kain_gsm}</span>
                    </td>
                    <td class="p-4 max-w-md">${varianHTML}</td>
                    <td class="p-4 font-black text-[#396399]">${totalStok} Pcs</td>
                    <td class="p-4 text-center space-x-2">
                        <button onclick="editStok(${p.id})" class="text-xs bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg">Edit</button>
                        <button onclick="hapusStok(${p.id})" class="text-xs bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function editStok(id) {
    getStore("store_produk").get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById("stok-id").value = p.id;
        document.getElementById("stok-nama").value = p.nama_model;
        document.getElementById("stok-kain").value = p.jenis_kain;
        document.getElementById("stok-gsm").value = p.tipe_kain_gsm;
        document.getElementById("stok-detail").value = p.detail_production;

        p.matriks_varian.forEach(v => {
            const row = document.querySelector(`#matriks-size-body tr[data-size="${v.size}"]`);
            if (row) {
                row.querySelector(".size-warna").value = v.warna;
                row.querySelector(".size-stok").value = v.stok;
                row.querySelector(".size-hpp").value = v.hpp_varian;
                row.querySelector(".size-jual").value = v.jual_varian;
                row.querySelector(".size-wh").value = v.wh;
                row.querySelector(".size-ht").value = v.ht;
                row.querySelector(".size-rec").value = v.bb_rec;
            }
        });
    };
}

function hapusStok(id) {
    if(confirm("Hapus master model pakaian ini?")) {
        getStore("store_produk", "readwrite").delete(id).onsuccess = () => refreshAllViews();
    }
}

// Fitur Unduh PDF Kolektif Massal untuk Stok
function cetakPDFMassalStok() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;
    
    doc.text(`LAPORAN EXEKUTIF MASTER STOK CLOTHVERS SYSTEM - PERIODE ${currentPeriode}`, 14, 15);
    
    getStore("store_produk").getAll().onsuccess = (e) => {
        const data = e.target.result.filter(p => p.periode === currentPeriode);
        const rows = [];
        data.forEach(p => {
            p.matriks_varian.forEach(v => {
                rows.push([
                    p.nama_model, p.jenis_kain, p.tipe_kain_gsm,
                    v.size, v.warna, v.stok, `Rp ${v.hpp_varian.toLocaleString()}`, `Rp ${v.jual_varian.toLocaleString()}`
                ]);
            });
        });
        
        doc.autoTable({
            head: [['Nama Model', 'Kain', 'GSM', 'Size', 'Warna', 'Stok', 'HPP Varian', 'Harga POS']],
            body: rows,
            startY: 22,
            theme: 'grid'
        });
        doc.save(`MASTER_STOK_MASSAL_${currentPeriode}.pdf`);
    };
}

// -------------------------------------------------------------------------
// MODUL B: MANAJEMEN HPP (ANTI-SALAH HITUNG LIVE SYNC)
// -------------------------------------------------------------------------
function loadDropdownProduk() {
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;
    const hppSelect = document.getElementById("hpp-pilih-model");
    const posSelect = document.getElementById("pos-pilih-produk");
    const returSelect = document.getElementById("retur-pilih-produk");

    if(!hppSelect) return;

    getStore("store_produk").getAll().onsuccess = (e) => {
        const data = e.target.result.filter(p => p.periode === currentPeriode);
        let opts = `<option value="">-- Pilih Model --</option>`;
        data.forEach(p => {
            opts += `<option value="${p.id}">${p.nama_model}</option>`;
        });
        hppSelect.innerHTML = opts;
        posSelect.innerHTML = opts;
        returSelect.innerHTML = opts;
    };
}

function syncBiayaKainOtomatis() {
    const modelId = document.getElementById("hpp-pilih-model").value;
    const sizeTerpilih = document.getElementById("hpp-pilih-size").value;
    const inputKain = document.getElementById("hpp-biaya-kain");

    if(!modelId) {
        inputKain.value = 0;
        return;
    }

    getStore("store_produk").get(parseInt(modelId)).onsuccess = (e) => {
        const p = e.target.result;
        const varianMatch = p.matriks_varian.find(v => v.size === sizeTerpilih);
        if (varianMatch) {
            inputKain.value = varianMatch.hpp_varian;
        } else {
            inputKain.value = 0;
        }
        hitungSkemaHPP();
    };
}

function hitungSkemaHPP() {
    const kain = parseFloat(document.getElementById("hpp-biaya-kain").value) || 0;
    const jahit = parseFloat(document.getElementById("hpp-ongkos-jahit").value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-sablon").value) || 0;
    const packaging = parseFloat(document.getElementById("hpp-packaging").value) || 0;
    const marginPercent = parseFloat(document.getElementById("hpp-margin").value) || 0;

    const hppTotal = kain + jahit + sablon + packaging;
    document.getElementById("hpp-total-calc").value = hppTotal;

    // Base Price dengan target margin profit
    const baseJual = hppTotal / (1 - (marginPercent / 100));

    // Hitung Multi-Channel Admin Marketplace Formula
    const shopeeAdm = parseFloat(document.getElementById("adm-shopee").value) || 0;
    const tokpedAdm = parseFloat(document.getElementById("adm-tokped").value) || 0;
    const tiktokAdm = parseFloat(document.getElementById("adm-tiktok").value) || 0;

    document.getElementById("txt-offline").innerText = `Rp ${Math.round(baseJual).toLocaleString()}`;
    document.getElementById("txt-shopee").innerText = `Rp ${Math.round(baseJual / (1 - (shopeeAdm/100))).toLocaleString()}`;
    document.getElementById("txt-tokped").innerText = `Rp ${Math.round(baseJual / (1 - (tokpedAdm/100))).toLocaleString()}`;
    document.getElementById("txt-tiktok").innerText = `Rp ${Math.round(baseJual / (1 - (tiktokAdm/100))).toLocaleString()}`;
}

document.getElementById("form-hpp").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("hpp-id").value;
    const modelId = document.getElementById("hpp-pilih-model").value;
    const modelText = document.getElementById("hpp-pilih-model").options[document.getElementById("hpp-pilih-model").selectedIndex].text;
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    const hppData = {
        model_id: parseInt(modelId),
        nama_model: modelText,
        size: document.getElementById("hpp-pilih-size").value,
        kain: parseFloat(document.getElementById("hpp-biaya-kain").value) || 0,
        jahit: parseFloat(document.getElementById("hpp-ongkos-jahit").value) || 0,
        sablon: parseFloat(document.getElementById("hpp-sablon").value) || 0,
        packaging: parseFloat(document.getElementById("hpp-packaging").value) || 0,
        margin: parseFloat(document.getElementById("hpp-margin").value) || 0,
        hpp_total: parseFloat(document.getElementById("hpp-total-calc").value) || 0,
        periode: currentPeriode,
        channels: {
            offline: document.getElementById("txt-offline").innerText,
            shopee: document.getElementById("txt-shopee").innerText,
            tokped: document.getElementById("txt-tokped").innerText,
            tiktok: document.getElementById("txt-tiktok").innerText
        }
    };

    const store = getStore("store_hpp", "readwrite");
    let req = id ? store.put({...hppData, id: parseInt(id)}) : store.add(hppData);

    req.onsuccess = () => {
        document.getElementById("hpp-id").value = "";
        document.getElementById("form-hpp").reset();
        refreshAllViews();
    };
});

function renderTabelHPP() {
    const tbody = document.getElementById("tabel-hpp-body");
    tbody.innerHTML = "";
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    getStore("store_hpp").getAll().onsuccess = (e) => {
        const list = e.target.result.filter(h => h.periode === currentPeriode);
        list.forEach(h => {
            tbody.innerHTML += `
                <tr>
                    <td class="p-4 font-bold text-[#0F172A]">${h.nama_model} <span class="text-xs font-mono px-1 bg-gray-200 rounded">Size ${h.size}</span></td>
                    <td class="p-4 text-xs text-gray-500">
                        Kain: Rp${h.kain.toLocaleString()} | Jahit: Rp${h.jahit.toLocaleString()}<br>
                        Sablon: Rp${h.sablon.toLocaleString()} | Pkg: Rp${h.packaging.toLocaleString()}
                    </td>
                    <td class="p-4 font-black text-rose-600">Rp ${h.hpp_total.toLocaleString()}</td>
                    <td class="p-4 text-xs font-bold space-y-0.5">
                        <span class="block text-emerald-600">Offline: ${h.channels.offline}</span>
                        <span class="block text-orange-500">Shopee: ${h.channels.shopee}</span>
                        <span class="block text-blue-500">Tokped: ${h.channels.tokped}</span>
                        <span class="block text-pink-600">TikTok: ${h.channels.tiktok}</span>
                    </td>
                    <td class="p-4 text-center space-x-1">
                        <button onclick="editHPP(${h.id})" class="text-xs bg-amber-500 text-white font-bold px-2 py-1 rounded-md">Edit</button>
                        <button onclick="hapusHPP(${h.id})" class="text-xs bg-rose-600 text-white font-bold px-2 py-1 rounded-md">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function editHPP(id) {
    getStore("store_hpp").get(id).onsuccess = (e) => {
        const h = e.target.result;
        document.getElementById("hpp-id").value = h.id;
        document.getElementById("hpp-pilih-model").value = h.model_id;
        document.getElementById("hpp-pilih-size").value = h.size;
        document.getElementById("hpp-biaya-kain").value = h.kain;
        document.getElementById("hpp-ongkos-jahit").value = h.jahit;
        document.getElementById("hpp-sablon").value = h.sablon;
        document.getElementById("hpp-packaging").value = h.packaging;
        document.getElementById("hpp-margin").value = h.margin;
        hitungSkemaHPP();
    };
}

function hapusHPP(id) {
    if(confirm("Hapus analisis skema HPP ini?")) {
        getStore("store_hpp", "readwrite").delete(id).onsuccess = () => refreshAllViews();
    }
}

function cetakPDFMassalHPP() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;
    
    doc.text(`LAPORAN STRUKTUR BIAYA & SIMULASI HPP MAKSIMAL - PERIODE ${currentPeriode}`, 14, 15);
    
    getStore("store_hpp").getAll().onsuccess = (e) => {
        const data = e.target.result.filter(h => h.periode === currentPeriode);
        const rows = data.map(h => [
            h.nama_model, h.size, `Rp ${h.kain.toLocaleString()}`, `Rp ${h.jahit.toLocaleString()}`,
            `Rp ${h.sablon.toLocaleString()}`, `Rp ${h.hpp_total.toLocaleString()}`, h.channels.offline, h.channels.shopee
        ]);
        
        doc.autoTable({
            head: [['Model Pakaian', 'Size', 'Kain', 'Jahit', 'Sablon', 'HPP Total', 'Harga Offline', 'Harga Shopee']],
            body: rows,
            startY: 22,
            theme: 'striped'
        });
        doc.save(`STRUKTUR_HPP_COLLECTIVE_${currentPeriode}.pdf`);
    };
}

// -------------------------------------------------------------------------
// MODUL C: TERMINAL POS KASIR (ENGINE & CHART SEBARAN)
// -------------------------------------------------------------------------
let platformChartObj = null;

function updateHargaPOSDinamis() {
    const modelId = document.getElementById("pos-pilih-produk").value;
    const size = document.getElementById("pos-pilih-size").value;
    const targetInput = document.getElementById("pos-harga-satuan");

    if(!modelId) return;

    getStore("store_produk").get(parseInt(modelId)).onsuccess = (e) => {
        const p = e.target.result;
        const variant = p.matriks_varian.find(v => v.size === size);
        targetInput.value = variant ? variant.jual_varian : 0;
        hitungTotalBayarPOS();
    };
}

function hitungTotalBayarPOS() {
    const harga = parseFloat(document.getElementById("pos-harga-satuan").value) || 0;
    const qty = parseInt(document.getElementById("pos-qty").value) || 1;
    const dp = parseFloat(document.getElementById("pos-dp").value) || 0;

    const total = harga * qty;
    const sisa = total - dp;

    document.getElementById("pos-txt-total").innerText = `Rp ${total.toLocaleString()}`;
    document.getElementById("pos-txt-sisa").innerText = `Rp ${sisa.toLocaleString()}`;
}

document.getElementById("form-pos").addEventListener("submit", function(e) {
    e.preventDefault();
    const modelId = document.getElementById("pos-pilih-produk").value;
    const modelText = document.getElementById("pos-pilih-produk").options[document.getElementById("pos-pilih-produk").selectedIndex].text;
    const size = document.getElementById("pos-pilih-size").value;
    const harga = parseFloat(document.getElementById("pos-harga-satuan").value) || 0;
    const qty = parseInt(document.getElementById("pos-qty").value) || 1;
    const dp = parseFloat(document.getElementById("pos-dp").value) || 0;
    const total = harga * qty;
    const sisa = total - dp;
    
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;
    const tanggalSekarang = new Date().toISOString().split('T')[0];

    const trx = {
        tanggal: tanggalSekarang,
        model_id: parseInt(modelId),
        nama_model: modelText,
        size: size,
        qty: qty,
        total: total,
        dp: dp,
        sisa: sisa,
        channel: document.getElementById("pos-channel").value,
        periode: currentPeriode
    };

    // Validasi & Potong Stok Lokal di store_produk
    const tx = db.transaction(["store_transaksi", "store_produk"], "readwrite");
    const pStore = tx.objectStore("store_produk");
    const tStore = tx.objectStore("store_transaksi");

    pStore.get(parseInt(modelId)).onsuccess = (event) => {
        const prod = event.target.result;
        const idx = prod.matriks_varian.findIndex(v => v.size === size);
        if(idx !== -1) {
            if(prod.matriks_varian[idx].stok < qty) {
                alert("Simpan gagal! Jumlah stok fisik di inventori tidak mencukupi.");
                return;
            }
            prod.matriks_varian[idx].stok -= qty; // Pemotongan stok langsung
            pStore.put(prod);
        }
    };

    tStore.add(trx).onsuccess = () => {
        document.getElementById("form-pos").reset();
        refreshAllViews();
    };
});

function renderLogPOS() {
    const tbody = document.getElementById("tabel-pos-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    const channelDataCounts = { "Offline Store": 0, "Shopee": 0, "Tokopedia": 0, "TikTok Shop": 0 };

    getStore("store_transaksi").getAll().onsuccess = (e) => {
        const data = e.target.result.filter(t => t.periode === currentPeriode);
        data.forEach(t => {
            if(channelDataCounts[t.channel] !== undefined) {
                channelDataCounts[t.channel] += t.total;
            }
            tbody.innerHTML += `
                <tr>
                    <td class="p-3 font-mono">${t.tanggal}</td>
                    <td class="p-3 font-bold">${t.nama_model} (${t.size}) x${t.qty}</td>
                    <td class="p-3"><span class="px-2 py-0.5 bg-gray-100 rounded-md font-bold">${t.channel}</span></td>
                    <td class="p-3 font-bold">Rp ${t.total.toLocaleString()} <span class="text-xs text-gray-400">(DP:Rp ${t.dp.toLocaleString()})</span></td>
                    <td class="p-3 font-bold text-rose-600">Rp ${t.sisa.toLocaleString()}</td>
                    <td class="p-3 text-center">
                        <button onclick="hapusPOS(${t.id})" class="text-rose-600 font-bold hover:underline">Hapus</button>
                    </td>
                </tr>
            `;
        });
        buildChartPlatform(channelDataCounts);
    };
}

function hapusPOS(id) {
    if(confirm("Hapus log penjualan kasir ini?")) {
        getStore("store_transaksi", "readwrite").delete(id).onsuccess = () => refreshAllViews();
    }
}

function buildChartPlatform(chartData) {
    const ctx = document.getElementById("chartPlatform");
    if(!ctx) return;
    if (platformChartObj) platformChartObj.destroy();

    platformChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(chartData),
            datasets: [{
                label: 'Volume Penjualan Omset (Rp)',
                data: Object.values(chartData),
                backgroundColor: ['#396399', '#f97316', '#3b82f6', '#ec4899'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// -------------------------------------------------------------------------
// MODUL D: RETUR & BARANG CACAT (LOGIC ENGINE)
// -------------------------------------------------------------------------
document.getElementById("form-retur").addEventListener("submit", function(e) {
    e.preventDefault();
    const modelId = document.getElementById("retur-pilih-produk").value;
    const modelText = document.getElementById("retur-pilih-produk").options[document.getElementById("retur-pilih-produk").selectedIndex].text;
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    const returData = {
        tanggal: new Date().toISOString().split('T')[0],
        model_id: parseInt(modelId),
        nama_model: modelText,
        size: document.getElementById("retur-size").value,
        jenis: document.getElementById("retur-jenis").value,
        qty: parseInt(document.getElementById("retur-qty").value) || 1,
        kronologi: document.getElementById("retur-kronologi").value,
        periode: currentPeriode
    };

    getStore("store_retur_reject", "readwrite").add(returData).onsuccess = () => {
        document.getElementById("form-retur").reset();
        refreshAllViews();
    };
});

function renderTabelRetur() {
    const tbody = document.getElementById("tabel-retur-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    getStore("store_retur_reject").getAll().onsuccess = (e) => {
        const list = e.target.result.filter(r => r.periode === currentPeriode);
        list.forEach(r => {
            tbody.innerHTML += `
                <tr>
                    <td class="p-4 font-mono">${r.tanggal}</td>
                    <td class="p-4 font-bold text-[#0F172A]">${r.nama_model} (${r.size})</td>
                    <td class="p-4"><span class="px-2 py-0.5 rounded text-xs font-bold ${r.jenis.includes('Cacat')?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}">${r.jenis}</span></td>
                    <td class="p-4 font-black">${r.qty} Pcs</td>
                    <td class="p-4 text-xs text-gray-500">${r.kronologi}</td>
                    <td class="p-4 text-center">
                        <button onclick="hapusRetur(${r.id})" class="text-xs bg-rose-600 text-white font-bold px-2 py-1 rounded">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function hapusRetur(id) {
    if(confirm("Hapus pencatatan kerusakan/retur ini?")) {
        getStore("store_retur_reject", "readwrite").delete(id).onsuccess = () => refreshAllViews();
    }
}

// -------------------------------------------------------------------------
// MODUL E: MANAJEMEN INVENTARIS ALAT KERJA (NEW CRUD)
// -------------------------------------------------------------------------
document.getElementById("form-inventaris").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("inv-id").value;
    const qty = parseInt(document.getElementById("inv-qty").value) || 0;
    const harga = parseFloat(document.getElementById("inv-harga").value) || 0;
    const totalNilai = qty * harga;
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    const dataInv = {
        tanggal_beli: document.getElementById("inv-tanggal").value,
        nama_alat: document.getElementById("inv-nama").value,
        kategori: document.getElementById("inv-kategori").value,
        qty: qty,
        harga_satuan: harga,
        total_nilai: totalNilai,
        masa_susut_bulan: parseInt(document.getElementById("inv-susut").value) || 12,
        periode: currentPeriode
    };

    const store = getStore("store_inventaris", "readwrite");
    let req = id ? store.put({...dataInv, id: parseInt(id)}) : store.add(dataInv);

    req.onsuccess = () => {
        resetFormInventaris();
        refreshAllViews();
    };
});

function resetFormInventaris() {
    document.getElementById("inv-id").value = "";
    document.getElementById("form-inventaris").reset();
}

function renderTabelInventaris() {
    const tbody = document.getElementById("tabel-inventaris-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    getStore("store_inventaris").getAll().onsuccess = (e) => {
        const list = e.target.result.filter(i => i.periode === currentPeriode);
        list.forEach(i => {
            const penyusutanPerBulan = i.total_nilai / i.masa_susut_bulan;
            tbody.innerHTML += `
                <tr>
                    <td class="p-4 font-mono text-xs">${i.tanggal_beli}</td>
                    <td class="p-4 font-bold text-[#0F172A]">${i.nama_alat}<br><span class="text-xs font-normal text-gray-400">${i.kategori}</span></td>
                    <td class="p-4 text-xs">${i.qty} Unit x Rp ${i.harga_satuan.toLocaleString()}</td>
                    <td class="p-4 font-black text-[#396399]">Rp ${i.total_nilai.toLocaleString()}</td>
                    <td class="p-4 text-xs font-bold text-rose-500">Rp ${Math.round(penyusutanPerBulan).toLocaleString()} / Bln</td>
                    <td class="p-4 text-center space-x-1">
                        <button onclick="editInventaris(${i.id})" class="text-xs bg-amber-500 text-white font-bold px-2 py-1 rounded">Edit</button>
                        <button onclick="hapusInventaris(${i.id})" class="text-xs bg-rose-600 text-white font-bold px-2 py-1 rounded">Hapus</button>
                    </td>
                </tr>
            `;
        });
    };
}

function editInventaris(id) {
    getStore("store_inventaris").get(id).onsuccess = (e) => {
        const i = e.target.result;
        document.getElementById("inv-id").value = i.id;
        document.getElementById("inv-tanggal").value = i.tanggal_beli;
        document.getElementById("inv-nama").value = i.nama_alat;
        document.getElementById("inv-kategori").value = i.kategori;
        document.getElementById("inv-qty").value = i.qty;
        document.getElementById("inv-harga").value = i.harga_satuan;
        document.getElementById("inv-susut").value = i.masa_susut_bulan;
    };
}

function hapusInventaris(id) {
    if(confirm("Hapus catatan aset alat kerja ini?")) {
        getStore("store_inventaris", "readwrite").delete(id).onsuccess = () => refreshAllViews();
    }
}

function cetakPDFMassalInventaris() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    doc.text(`LAPORAN KEKAYAAN ASET & INVENTARIS OPERASIONAL - PERIODE ${currentPeriode}`, 14, 15);

    getStore("store_inventaris").getAll().onsuccess = (e) => {
        const data = e.target.result.filter(i => i.periode === currentPeriode);
        const rows = data.map(i => [
            i.tanggal_beli, i.nama_alat, i.kategori, i.qty, `Rp ${i.harga_satuan.toLocaleString()}`, `Rp ${i.total_nilai.toLocaleString()}`
        ]);

        doc.autoTable({
            head: [['Tanggal Beli', 'Nama Alat', 'Kategori', 'Qty', 'Harga Satuan', 'Total Nilai']],
            body: rows,
            startY: 22,
            theme: 'grid'
        });
        doc.save(`KAPITAL_ASET_INVENTARIS_${currentPeriode}.pdf`);
    };
}

// -------------------------------------------------------------------------
// MODUL F: AKUNTANSI & KEUANGAN (BUKU LAPORAN AKUMULASI KRONOLOGIS)
// -------------------------------------------------------------------------
document.getElementById("form-jurnal").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("jurnal-id").value;
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;

    const dataJurnal = {
        tanggal: document.getElementById("jurnal-tanggal").value,
        tipe: document.getElementById("jurnal-tipe").value,
        nominal: parseFloat(document.getElementById("jurnal-nominal").value) || 0,
        keterangan: document.getElementById("jurnal-keterangan").value,
        periode: currentPeriode
    };

    const store = getStore("store_jurnal_akuntansi", "readwrite");
    let req = id ? store.put({...dataJurnal, id: parseInt(id)}) : store.add(dataJurnal);

    req.onsuccess = () => {
        document.getElementById("jurnal-id").value = "";
        document.getElementById("form-jurnal").reset();
        refreshAllViews();
    };
});

function renderBukuAkumulasi() {
    const tbody = document.getElementById("tabel-buku-akumulasi-body");
    if(!tbody) return;
    tbody.innerHTML = "";

    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;
    const filterRentang = document.getElementById("filter-rentang-jurnal").value;

    let aggregateLedger = [];
    let totalDebit = 0;
    let totalKredit = 0;

    // Ambil Data dari 3 Store Berbeda untuk Akumulasi Buku Besar
    const p1 = new Promise((resolve) => {
        getStore("store_transaksi").getAll().onsuccess = (e) => {
            e.target.result.filter(t => t.periode === currentPeriode).forEach(t => {
                aggregateLedger.push({
                    id_asal: t.id, tanggal: t.tanggal, modul: "POS Kasir Penjualan",
                    uraian: `Penjualan ${t.nama_model} (${t.size}) x${t.qty} via ${t.channel}`,
                    debit: t.total, kredit: 0, canDelete: false
                });
            });
            resolve();
        };
    });

    const p2 = new Promise((resolve) => {
        getStore("store_jurnal_akuntansi").getAll().onsuccess = (e) => {
            e.target.result.filter(j => j.periode === currentPeriode).forEach(j => {
                const isMasuk = j.tipe.includes("Masuk");
                aggregateLedger.push({
                    id_asal: j.id, tanggal: j.tanggal, modul: "Jurnal Kas Manual",
                    uraian: j.keterangan,
                    debit: isMasuk ? j.nominal : 0,
                    kredit: isMasuk ? 0 : j.nominal,
                    canDelete: true
                });
            });
            resolve();
        };
    });

    const p3 = new Promise((resolve) => {
        getStore("store_inventaris").getAll().onsuccess = (e) => {
            e.target.result.filter(i => i.periode === currentPeriode).forEach(i => {
                const susut = i.total_nilai / i.masa_susut_bulan;
                aggregateLedger.push({
                    id_asal: i.id, tanggal: i.tanggal_beli, modul: "Aset / Penyusutan",
                    uraian: `Penyusutan Nilai Buku Bulanan Aset: ${i.nama_alat}`,
                    debit: 0, kredit: Math.round(susut), canDelete: false
                });
            });
            resolve();
        };
    });

    Promise.all([p1, p2, p3]).then(() => {
        // Sort Kronologis berdasar Tanggal
        aggregateLedger.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        // Terapkan Filter Rentang Khusus
        const hariIniStr = new Date().toISOString().split('T')[0];
        if (filterRentang === "hari") {
            aggregateLedger = aggregateLedger.filter(x => x.tanggal === hariIniStr);
        } else if (filterRentang === "minggu") {
            const semingguLalu = new Date();
            semingguLalu.setDate(semingguLalu.getDate() - 7);
            aggregateLedger = aggregateLedger.filter(x => new Date(x.tanggal) >= semingguLalu);
        }

        // Render Baris & Akumulasi Nilai
        aggregateLedger.forEach(item => {
            totalDebit += item.debit;
            totalKredit += item.kredit;

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50/80">
                    <td class="p-3 font-mono">${item.tanggal}</td>
                    <td class="p-3 font-bold text-gray-400">${item.modul}</td>
                    <td class="p-3 text-[#0F172A] font-bold">${item.uraian}</td>
                    <td class="p-3 text-emerald-600 font-bold">Rp ${item.debit > 0 ? item.debit.toLocaleString() : '-'}</td>
                    <td class="p-3 text-rose-600 font-bold">Rp ${item.kredit > 0 ? item.kredit.toLocaleString() : '-'}</td>
                    <td class="p-3 text-center">
                        ${item.canDelete ? `<button onclick="hapusJurnalKasManual(${item.id_asal})" class="text-rose-600 hover:underline">Hapus</button>` : `<span class="text-gray-300 font-normal">Sistem</span>`}
                    </td>
                </tr>
            `;
        });

        // Update Widget Utama Finansial
        document.getElementById("widget-omset").innerText = `Rp ${totalDebit.toLocaleString()}`;
        document.getElementById("widget-pengeluaran").innerText = `Rp ${totalKredit.toLocaleString()}`;
        const labaBersih = totalDebit - totalKredit;
        document.getElementById("widget-bersih").innerText = `Rp ${labaBersih.toLocaleString()}`;
        document.getElementById("widget-bersih").className = `text-2xl font-black ${labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
    });
}

function hapusJurnalKasManual(id) {
    if(confirm("Hapus pencatatan kas manual ini dari buku besar?")) {
        getStore("store_jurnal_akuntansi", "readwrite").delete(id).onsuccess = () => refreshAllViews();
    }
}

// Ekspor PDF Buku Besar Akumulasi Kolektif
function cetakPDFBukuAccumulasi() {
    alert("Ekspor PDF Massal Buku Besar Sedang Diproses...");
    // Logika mirip cetakPDFMassalStok menggunakan data ter-filter dari aggregateLedger.
}

// Ekspor Excel CSV Terbaca Langsung di Spreadsheet / Excel
function eksporExcelCSVBukuAkumulasi() {
    const currentPeriode = document.getElementById("global-bulan").value + "-" + document.getElementById("global-tahun").value;
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Modul Asal,Keterangan Uraian,Debit (Uang Masuk),Kredit (Uang Keluar)\n";
    
    const rows = document.querySelectorAll("#tabel-buku-akumulasi-body tr");
    if(rows.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }
    
    rows.forEach(tr => {
        const tds = tr.querySelectorAll("td");
        if(tds.length >= 5) {
            const line = `"${tds[0].innerText}","${tds[1].innerText}","${tds[2].innerText}","${tds[3].innerText}","${tds[4].innerText}"`;
            csvContent += line + "\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GENERAL_LEDGER_ERR_CLOTHVERS_${currentPeriode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// -------------------------------------------------------------------------
// MODUL G: DATABASE SYNC BRIDGE (BACKUP & RESTORE BACKWARD COMPATIBLE)
// -------------------------------------------------------------------------
function backupSeluruhDatabaseJSON() {
    const backupData = {};
    const stores = ["store_produk", "store_hpp", "store_transaksi", "store_jurnal_akuntansi", "store_retur_reject", "store_inventaris"];
    let counter = 0;

    stores.forEach(sName => {
        getStore(sName).getAll().onsuccess = (e) => {
            backupData[sName] = e.target.result;
            counter++;
            if (counter === stores.length) {
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `CLOTHVERS_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
            }
        };
    });
}

function restoreSeluruhDatabaseJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            const stores = Object.keys(importedData);
            
            let counter = 0;
            stores.forEach(sName => {
                const tx = db.transaction(sName, "readwrite");
                const store = tx.objectStore(sName);
                store.clear(); // Bersihkan data lama demi menghindari tabrakan ID
                
                importedData[sName].forEach(item => {
                    store.add(item);
                });

                tx.oncomplete = () => {
                    counter++;
                    if(counter === stores.length) {
                        alert("Database Berhasil Dipulihkan (Restore Complete) secara sempurna!");
                        refreshAllViews();
                    }
                };
            });
        } catch (err) {
            alert("Format file JSON rusak atau tidak dikenali oleh sistem Clothvers.");
        }
    };
    reader.readAsText(file);
}
