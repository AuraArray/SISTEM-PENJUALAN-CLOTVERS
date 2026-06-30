/**
 * CLOTHVERS SYSTEM - CORE ENGINE v1.0
 * Pure Vanilla JS, IndexedDB Architecture, Multi-Item POS Engine, Safe Optional Chaining
 */

// ==========================================
// A. INISIALISASI DATABASE & VAR GLOBAL
// ==========================================
let db = null;
let currentMatriksWarna = []; // Menyimpan state warna yang sedang diinput di UI
let currentCart = [];         // State keranjang belanja POS temporer
let lastSavedInvoice = null;  // Cache invoice transaksi terakhir untuk cetak struk/WA
let filterJurnalAktif = "HARI"; // Default sub-filter jurnal akuntansi

const APP_STORES = [
    "store_produk",
    "store_hpp",
    "store_transaksi",
    "store_jurnal_akuntansi",
    "store_retur_reject",
    "store_inventaris",
    "store_customer"
];

function initIndexedDB() {
    const request = indexedDB.open("ClothversDB", 1);

    request.onupgradeneeded = function(e) {
        const database = e.target.result;
        APP_STORES.forEach(storeName => {
            if (!database.objectStoreNames.contains(storeName)) {
                if (storeName === "store_inventaris" || storeName === "store_customer") {
                    database.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
                } else {
                    database.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
                }
            }
        });
    };

    request.onsuccess = function(e) {
        db = e.target.result;
        console.log("ClothversDB Sukses Terkoneksi. Valid s.d Tahun 2030+");
        loadSemuaDataKeTabel();
    };

    request.onerror = function() {
        console.error("Gagal memuat database ClothversDB lokal browser.");
    };
}

document.addEventListener("DOMContentLoaded", () => {
    initIndexedDB();
    setSistemWaktuDefault();
});

function setSistemWaktuDefault() {
    const hariIni = new Date().toISOString().split('T')[0];
    const inpOrder = document.getElementById("pos-tgl-order");
    const inpEstimasi = document.getElementById("pos-tgl-estimasi");
    if (inpOrder) inpOrder.value = hariIni;
    if (inpEstimasi) inpEstimasi.value = hariIni;
}

// ==========================================
// B. NAVIGASI UTAMA & FITUR RESPONSIVE
// ==========================================
function switchModule(moduleId) {
    document.querySelectorAll(".module-view").forEach(view => view.classList.add("hidden"));
    const targetModule = document.getElementById(`mod-${moduleId}`);
    if (targetModule) targetModule.classList.remove("hidden");

    // Perbarui judul topbar secara dinamis
    const titles = {
        'dashboard-stok': '📦 Input & Stok Pakaian',
        'dashboard-hpp': '📊 Manajemen HPP & Simulasi Penjualan',
        'terminal-pos': '🛒 Terminal POS Kasir Multi-Item',
        'database-customer': '👥 Database Customer Hub (CRM Log)',
        'modul-retur': '🔄 Modul Kelola Retur & Inventaris Alat',
        'dashboard-akuntansi': '💵 Dashboard Akuntansi & Buku Laporan Jurnal',
        'panel-backup': '⚙️ Database Sync Bridge & Backup Panel'
    };
    const titleElem = document.getElementById("current-module-title");
    if (titleElem) titleElem.innerText = titles[moduleId] || "Clothvers System";

    // Perbarui status aktif tombol navigasi di komputer & HP
    updateNavButtonsStyle(moduleId);
}

function updateNavButtonsStyle(activeId) {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("bg-white", "shadow-xs", "text-[#1E293B]");
        btn.classList.add("text-gray-600", "hover:bg-gray-100");
    });
    // Sinkronisasi warna navigasi bawah smartphone
    const bottomNavs = document.querySelectorAll("div.fixed bottom-0 button");
    bottomNavs.forEach(btn => {
        if (btn.getAttribute("onclick")?.includes(activeId)) {
            btn.classList.remove("text-gray-500");
            btn.classList.add("text-[#1E293B]");
        } else {
            btn.classList.remove("text-[#1E293B]");
            btn.classList.add("text-gray-500");
        }
    });
}

function toggleMobileMenu() {
    const drawer = document.getElementById("tablet-drawer");
    if (drawer) drawer.classList.toggle("hidden");
}

function triggerGlobalFilter() {
    console.log("Global Filter Periode Berubah Ke:", document.getElementById("global-filter-periode")?.value);
    loadSemuaDataKeTabel();
}

// ==========================================
// C. LOGIKA MODULE A: DASHBOARD INPUT STOK
// ==========================================
function tambahWarnaKeMatriks() {
    const inputWarna = document.getElementById("stok-input-warna");
    const warna = inputWarna?.value.trim();

    if (!warna) {
        alert("Ketik varian warna terlebih dahulu.");
        return;
    }

    if (currentMatriksWarna.includes(warna)) {
        alert("Warna tersebut sudah ditambahkan.");
        return;
    }

    currentMatriksWarna.push(warna);
    inputWarna.value = "";
    renderMatriksFormUkuran();
}

function hapusWarnaDariMatriks(warna) {
    currentMatriksWarna = currentMatriksWarna.filter(w => w !== warna);
    renderMatriksFormUkuran();
}

function renderMatriksFormUkuran() {
    const container = document.getElementById("matriks-warna-container");
    if (!container) return;
    container.innerHTML = "";

    const listUkuran = ["S", "M", "L", "XL", "2XL"];

    currentMatriksWarna.forEach(warna => {
        const blockWarna = document.createElement("div");
        blockWarna.className = "bg-[#f5f5f7] rounded-xl p-4 border border-gray-200 relative";
        
        let headerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-bold text-[#1E293B] bg-white px-3 py-1 rounded-md border border-gray-100">WARNA: ${warna}</span>
                <button type="button" onclick="hapusWarnaDariMatriks('${warna}')" class="text-rose-600 text-xs font-bold hover:underline">Hapus Blok Warna</button>
            </div>
            <div class="w-full overflow-x-auto block whitespace-nowrap">
                <table class="w-full text-left border-collapse text-xs bg-white rounded-lg overflow-hidden">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 font-bold">
                            <th class="p-2">Size</th>
                            <th class="p-2">Stok</th>
                            <th class="p-2">HPP Asli (Rp)</th>
                            <th class="p-2">Harga Jual (Rp)</th>
                            <th class="p-2">WH (Lebar)</th>
                            <th class="p-2">HT (Tinggi)</th>
                            <th class="p-2">TB Min-Max (cm)</th>
                            <th class="p-2">BB Min-Max (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        listUkuran.forEach(size => {
            headerHTML += `
                <tr class="border-b border-gray-100 font-medium">
                    <td class="p-2 font-bold text-[#0F172A]">${size}</td>
                    <td class="p-2"><input type="number" id="stok-${warna}-${size}-qty" value="0" class="w-14 bg-[#f5f5f7] border p-1 rounded text-center"></td>
                    <td class="p-2"><input type="number" id="stok-${warna}-${size}-hpp" value="0" class="w-20 bg-[#f5f5f7] border p-1 rounded"></td>
                    <td class="p-2"><input type="number" id="stok-${warna}-${size}-jual" value="0" class="w-20 bg-[#f5f5f7] border p-1 rounded"></td>
                    <td class="p-2"><input type="text" id="stok-${warna}-${size}-wh" placeholder="50" class="w-12 bg-[#f5f5f7] border p-1 rounded text-center"></td>
                    <td class="p-2"><input type="text" id="stok-${warna}-${size}-ht" placeholder="70" class="w-12 bg-[#f5f5f7] border p-1 rounded text-center"></td>
                    <td class="p-2">
                        <div class="flex gap-1 items-center">
                            <input type="number" id="stok-${warna}-${size}-tbmin" placeholder="Min" class="w-12 bg-[#f5f5f7] border p-1 rounded text-center text-[10px]">
                            <span>-</span>
                            <input type="number" id="stok-${warna}-${size}-tbmax" placeholder="Max" class="w-12 bg-[#f5f5f7] border p-1 rounded text-center text-[10px]">
                        </div>
                    </td>
                    <td class="p-2">
                        <div class="flex gap-1 items-center">
                            <input type="number" id="stok-${warna}-${size}-bbmin" placeholder="Min" class="w-12 bg-[#f5f5f7] border p-1 rounded text-center text-[10px]">
                            <span>-</span>
                            <input type="number" id="stok-${warna}-${size}-bbmax" placeholder="Max" class="w-12 bg-[#f5f5f7] border p-1 rounded text-center text-[10px]">
                        </div>
                    </td>
                </tr>
            `;
        });

        headerHTML += `</tbody></table></div>`;
        blockWarna.innerHTML = headerHTML;
        container.appendChild(blockWarna);
    });
}

function simpanProdukKeDatabase() {
    const namaModel = document.getElementById("stok-nama-model")?.value.trim();
    const jenisKain = document.getElementById("stok-jenis-kain")?.value.trim();
    const tipeGsm = document.getElementById("stok-tipe-gsm")?.value.trim();
    const detailProduksi = document.getElementById("stok-detail-produksi")?.value.trim();

    if (!namaModel || currentMatriksWarna.length === 0) {
        alert("Nama Model dan Minimal Satu Varian Warna Wajib Diisi.");
        return;
    }

    let matriksLengkap = [];
    const listUkuran = ["S", "M", "L", "XL", "2XL"];

    currentMatriksWarna.forEach(warna => {
        listUkuran.forEach(size => {
            const qty = parseFloat(document.getElementById(`stok-${warna}-${size}-qty`)?.value) || 0;
            const hpp = parseFloat(document.getElementById(`stok-${warna}-${size}-hpp`)?.value) || 0;
            const jual = parseFloat(document.getElementById(`stok-${warna}-${size}-jual`)?.value) || 0;
            const wh = document.getElementById(`stok-${warna}-${size}-wh`)?.value || "";
            const ht = document.getElementById(`stok-${warna}-${size}-ht`)?.value || "";
            const tb_min = parseFloat(document.getElementById(`stok-${warna}-${size}-tbmin`)?.value) || 0;
            const tb_max = parseFloat(document.getElementById(`stok-${warna}-${size}-tbmax`)?.value) || 0;
            const bb_min = parseFloat(document.getElementById(`stok-${warna}-${size}-bbmin`)?.value) || 0;
            const bb_max = parseFloat(document.getElementById(`stok-${warna}-${size}-bbmax`)?.value) || 0;

            matriksLengkap.push({
                warna, size, stok: qty, hpp_varian: hpp, jual_varian: jual, wh, ht,
                tb_min, tb_max, bb_min, bb_max
            });
        });
    });

    const payload = {
        nama_model: namaModel,
        jenis_kain: jenisKain,
        tipe_kain_gsm: tipeGsm,
        detail_produksi: detailProduksi,
        matriks_varian: matriksLengkap,
        timestamp: new Date().getTime()
    };

    const trans = db.transaction(["store_produk"], "readwrite");
    const store = trans.objectStore("store_produk");
    const request = store.add(payload);

    request.onsuccess = function() {
        alert("Master Produk Sukses Tersimpan permanen.");
        // Reset formulir kembali kosong secara default
        document.getElementById("stok-nama-model").value = "";
        document.getElementById("stok-jenis-kain").value = "";
        document.getElementById("stok-tipe-gsm").value = "";
        document.getElementById("stok-detail-produksi").value = "";
        currentMatriksWarna = [];
        renderMatriksFormUkuran();
        loadSemuaDataKeTabel();
    };
}

function hapusProduk(id) {
    if (!confirm("Hapus master produk ini?")) return;
    const trans = db.transaction(["store_produk"], "readwrite");
    trans.objectStore("store_produk").delete(id);
    trans.oncomplete = function() { loadSemuaDataKeTabel(); };
}

// ==========================================
// D. LOGIKA MODULE B: MANAJEMEN HPP SIMULASI
// ==========================================
function syncHppKainOtomatis() {
    const idProduk = parseInt(document.getElementById("hpp-select-model")?.value);
    const sizeTerpilih = document.getElementById("hpp-select-size")?.value;
    const inputKain = document.getElementById("hpp-biaya-kain");

    if (!idProduk || !inputKain) return;

    const store = db.transaction(["store_produk"], "readonly").objectStore("store_produk");
    store.get(idProduk).onsuccess = function(e) {
        const prod = e.target.result;
        // Anti-TypeError Guard via Optional Chaining & Fallback Value
        const matriks = prod?.matriks_varian || [];
        const match = matriks.find(m => m?.size === sizeTerpilih);
        inputKain.value = match?.hpp_varian || 0;
        hitungHppTotal();
    };
}

function hitungHppTotal() {
    const kain = parseFloat(document.getElementById("hpp-biaya-kain")?.value) || 0;
    const jahit = parseFloat(document.getElementById("hpp-ongkos-jahit")?.value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-sablon")?.value) || 0;
    const pack = parseFloat(document.getElementById("hpp-packaging")?.value) || 0;
    const margin = parseFloat(document.getElementById("hpp-margin")?.value) || 0;

    const hppTotal = kain + jahit + sablon + pack;
    const displayTotal = document.getElementById("hpp-total-display");
    if (displayTotal) displayTotal.innerText = "Rp " + hppTotal.toLocaleString("id-ID");

    hitungKebutuhanJual();
}

function hitungKebutuhanJual() {
    const kain = parseFloat(document.getElementById("hpp-biaya-kain")?.value) || 0;
    const jahit = parseFloat(document.getElementById("hpp-ongkos-jahit")?.value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-sablon")?.value) || 0;
    const pack = parseFloat(document.getElementById("hpp-packaging")?.value) || 0;
    const margin = parseFloat(document.getElementById("hpp-margin")?.value) || 0;

    const hppTotal = kain + jahit + sablon + pack;
    const hargaDasarUntung = hppTotal + (hppTotal * (margin / 100));

    const channels = ["wa", "shopee", "tiktok", "reseller", "grosir"];
    channels.forEach(ch => {
        const pctAdmin = parseFloat(document.getElementById(`admin-${ch}`)?.value) || 0;
        // Rumus membalikkan potongan harga marketplace agar margin tidak bocor keluar
        let hargaJualRekomendasi = hargaDasarUntung / (1 - (pctAdmin / 100));
        if (pctAdmin >= 100) hargaJualRekomendasi = hargaDasarUntung;

        const elem = document.getElementById(`rec-${ch}`);
        if (elem) elem.innerText = "Rp " + Math.round(hargaJualRekomendasi).toLocaleString("id-ID");
    });
}

function simpanLogHpp() {
    const idProduk = parseInt(document.getElementById("hpp-select-model")?.value);
    const selectModelElem = document.getElementById("hpp-select-model");
    const namaModel = selectModelElem?.options[selectModelElem.selectedIndex]?.text || "Unknown Model";
    const sizeTerpilih = document.getElementById("hpp-select-size")?.value;

    const kain = parseFloat(document.getElementById("hpp-biaya-kain")?.value) || 0;
    const jahit = parseFloat(document.getElementById("hpp-ongkos-jahit")?.value) || 0;
    const sablon = parseFloat(document.getElementById("hpp-sablon")?.value) || 0;
    const pack = parseFloat(document.getElementById("hpp-packaging")?.value) || 0;
    const margin = parseFloat(document.getElementById("hpp-margin")?.value) || 0;

    const hppTotal = kain + jahit + sablon + pack;
    const hargaDasarUntung = hppTotal + (hppTotal * (margin / 100));

    let skemaJual = {};
    ["wa", "shopee", "tiktok", "reseller", "grosir"].forEach(ch => {
        const pct = parseFloat(document.getElementById(`admin-${ch}`)?.value) || 0;
        skemaJual[ch] = Math.round(hargaDasarUntung / (1 - (pct / 100)));
    });

    const payload = {
        nama_model: namaModel,
        size_terpilih: sizeTerpilih,
        biaya_kain_otomatis: kain,
        ongkos_jahit: jahit,
        aplikasi_sablon: sablon,
        packaging: pack,
        margin_percent: margin,
        hpp_total: hppTotal,
        harga_jual_channels: skemaJual,
        timestamp: new Date().getTime()
    };

    const trans = db.transaction(["store_hpp"], "readwrite");
    trans.objectStore("store_hpp").add(payload);
    trans.oncomplete = function() {
        alert("Simulasi Skema Finansial HPP Berhasil Dikunci.");
        loadSemuaDataKeTabel();
    };
}

function hapusHpp(id) {
    if (!confirm("Hapus data log HPP ini?")) return;
    const trans = db.transaction(["store_hpp"], "readwrite");
    trans.objectStore("store_hpp").delete(id);
    trans.oncomplete = function() { loadSemuaDataKeTabel(); };
}

// ==========================================
// E. LOGIKA MODULE C: TERMINAL POS KASIR
// ==========================================
function renderPosVarianPilihan() {
    const idProd = parseInt(document.getElementById("pos-select-produk")?.value);
    const selectVarian = document.getElementById("pos-select-varian");
    if (!idProd || !selectVarian) return;

    selectVarian.innerHTML = "";
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").get(idProd).onsuccess = function(e) {
        const prod = e.target.result;
        // Anti-TypeError Guard via Optional Chaining
        const matriks = prod?.matriks_varian || [];
        matriks.forEach(v => {
            const opt = document.createElement("option");
            opt.value = `${v?.warna}|${v?.size}|${v?.jual_varian}`;
            opt.innerText = `Warna: ${v?.warna} [${v?.size}] - Harga: Rp ${v?.jual_varian?.toLocaleString("id-ID")} (Stok: ${v?.stok}) - WH:${v?.wh} HT:${v?.ht}`;
            selectVarian.appendChild(opt);
        });
    };
}

function tambahKeKeranjangPOS() {
    const idProd = parseInt(document.getElementById("pos-select-produk")?.value);
    const modelText = document.getElementById("pos-select-produk")?.options[document.getElementById("pos-select-produk").selectedIndex]?.text;
    const valVarian = document.getElementById("pos-select-varian")?.value;

    if (!idProd || !valVarian) return;

    const [warna, size, harga] = valVarian.split("|");

    // Mekanisme Keranjang Multi-Item agar tidak menimpa item berbeda jenis
    const eksisIndex = currentCart.findIndex(c => c.id_produk === idProd && c.warna === warna && c.size === size);

    if (eksisIndex > -1) {
        currentCart[eksisIndex].qty += 1;
    } else {
        currentCart.push({
            id_produk: idProd,
            nama_model: modelText,
            warna: warna,
            size: size,
            harga: parseFloat(harga) || 0,
            qty: 1
        });
    }

    renderCartTablePOS();
}

function ubahQtyCart(index, qtyBaru) {
    if (qtyBaru < 1) return;
    currentCart[index].qty = parseInt(qtyBaru) || 1;
    renderCartTablePOS();
}

function hapusItemCart(index) {
    currentCart.splice(index, 1);
    renderCartTablePOS();
}

function renderCartTablePOS() {
    const tbody = document.getElementById("table-body-cart");
    if (!tbody) return;
    tbody.innerHTML = "";

    let subtotal = 0;

    currentCart.forEach((item, idx) => {
        const totalItem = item.harga * item.qty;
        subtotal += totalItem;

        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 font-medium";
        tr.innerHTML = `
            <td class="p-3">
                <div class="font-bold text-[#0F172A]">${item.nama_model}</div>
                <div class="text-xs text-gray-400">Warna: ${item.warna} | Size: ${item.size}</div>
            </td>
            <td class="p-3">
                <input type="number" value="${item.qty}" oninput="ubahQtyCart(${idx}, this.value)" class="w-14 bg-[#f5f5f7] border p-1 rounded text-center font-bold">
            </td>
            <td class="p-3 text-gray-600">Rp ${item.harga.toLocaleString("id-ID")}</td>
            <td class="p-3 font-bold text-[#0F172A]">Rp ${totalItem.toLocaleString("id-ID")}</td>
            <td class="p-3 text-center">
                <button onclick="hapusItemCart(${idx})" class="text-rose-600 hover:underline text-xs font-bold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("invoice-subtotal").innerText = "Rp " + subtotal.toLocaleString("id-ID");
    hitungGrandTotal();
}

function hitungGrandTotal() {
    const txtSub = document.getElementById("invoice-subtotal")?.innerText || "0";
    const subtotal = parseFloat(txtSub.replace(/[^0-9]/g, "")) || 0;

    const diskonNilai = parseFloat(document.getElementById("pos-diskon-nilai")?.value) || 0;
    const diskonTipe = document.getElementById("pos-diskon-tipe")?.value;

    let totalPotongan = 0;
    if (diskonTipe === "persen") {
        totalPotongan = subtotal * (diskonNilai / 100);
    } else {
        totalPotongan = diskonNilai;
    }

    const grandTotal = Math.max(0, subtotal - totalPotongan);
    document.getElementById("invoice-grand-total").innerText = "Rp " + grandTotal.toLocaleString("id-ID");
    
    // Set default nominal bayar sama dengan grand total untuk kemudahan user
    if (document.getElementById("pos-nominal-bayar").value == 0) {
        document.getElementById("pos-nominal-bayar").value = grandTotal;
    }
}

function finalisasiTransaksiPOS() {
    const namaCust = document.getElementById("pos-customer-nama")?.value.trim();
    const hpCust = document.getElementById("pos-customer-hp")?.value.trim();
    const tglOrder = document.getElementById("pos-tgl-order")?.value;
    const tglEstimasi = document.getElementById("pos-tgl-estimasi")?.value;
    const kurir = document.getElementById("pos-kurir")?.value || "-";
    const resi = document.getElementById("pos-resi")?.value || "Belum Keluar";

    const metodeBayar = document.getElementById("pos-metode-bayar")?.value;
    const nominalBayar = parseFloat(document.getElementById("pos-nominal-bayar")?.value) || 0;

    if (currentCart.length === 0 || !namaCust || !hpCust) {
        alert("Keranjang kosong atau Identitas Customer Belum Lengkap.");
        return;
    }

    const grandTotal = parseFloat(document.getElementById("invoice-grand-total").innerText.replace(/[^0-9]/g, "")) || 0;

    const invoicePayload = {
        customer: { nama: namaCust, hp: hpCust },
        timeline: { order: tglOrder, estimasi: tglEstimasi },
        logistik: { kurir, resi },
        items: currentCart,
        keuangan: { grandTotal, metodeBayar, nominalBayar },
        timestamp: new Date().getTime()
    };

    const trans = db.transaction(["store_transaksi", "store_customer", "store_jurnal_akuntansi"], "readwrite");
    
    // 1. Simpan Log Transaksi POS
    trans.objectStore("store_transaksi").add(invoicePayload);

    // 2. Sinkronisasi Otomatis Database Customer CRM
    const customerStore = trans.objectStore("store_customer");
    customerStore.openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            if (cursor.value.nomor_hp === hpCust) {
                let dataLama = cursor.value;
                dataLama.total_transaksi += grandTotal;
                cursor.update(dataLama);
                return;
            }
            cursor.continue();
        } else {
            customerStore.add({
                tanggal_terdaftar: tglOrder,
                nama_customer: namaCust,
                nomor_hp: hpCust,
                total_transaksi: grandTotal,
                keterangan: "Aktif via Kasir POS"
            });
        }
    };

    // 3. Masuk Otomatis ke Laporan Keuangan Akuntansi Real-Time
    let keteranganJurnal = `Kas Masuk Order POS: ${namaCust} (${currentCart.length} Item)`;
    let tipeAliran = "MASUK_OMSET";
    if (metodeBayar === "DP (Uang Muka)") {
        keteranganJurnal = `DP Masuk PO Antrean: ${namaCust}`;
        tipeAliran = "MASUK_DP";
    } else if (metodeBayar === "PIUTANG") {
        keteranganJurnal = `Piutang Piutang Baru: ${namaCust}`;
        tipeAliran = "PIUTANG_BARU";
    }

    trans.objectStore("store_jurnal_akuntansi").add({
        tanggal: tglOrder,
        keterangan: keteranganJurnal,
        tipe: tipeAliran,
        nominal: grandTotal,
        timestamp: new Date().getTime()
    });

    trans.oncomplete = function() {
        alert("Transaksi Berhasil Diproses & Masuk Pembukuan Keuangan!");
        lastSavedInvoice = invoicePayload;

        // Aktifkan Tombol Struk PDF & WA Akses Cepat
        const btnPdf = document.getElementById("btn-print-pdf-pos");
        const btnWa = document.getElementById("btn-wa-pos");
        if (btnPdf) { btnPdf.disabled = false; btnPdf.className = "w-full bg-[#1E293B] text-white font-bold text-xs py-2 rounded-lg hover:bg-black"; btnPdf.setAttribute("onclick", "cetakStrukPDFTerakhir()"); }
        if (btnWa) { btnWa.disabled = false; btnWa.className = "w-full bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg hover:bg-emerald-700"; btnWa.setAttribute("onclick", "kirimWhatsAppStrukLast()"); }

        // Bersihkan Keranjang
        currentCart = [];
        renderCartTablePOS();
        loadSemuaDataKeTabel();
    };
}

function cetakStrukPDFTerakhir() {
    if (!lastSavedInvoice) return;
    const { doc } = window.jspdf;
    const pdf = new jspdf.jsPDF({ orientation: "p", unit: "mm", format: [80, 150] }); // Format Thermal Struk 80mm

    pdf.setFontSize(10);
    pdf.text("CLOTHVERS SYSTEM", 40, 10, { align: "center" });
    pdf.setFontSize(7);
    pdf.text("ERP Single-Page v1.0", 40, 14, { align: "center" });
    pdf.text("--------------------------------------------------", 40, 18, { align: "center" });

    pdf.text(`Cust: ${lastSavedInvoice.customer.nama} (${lastSavedInvoice.customer.hp})`, 5, 23);
    pdf.text(`Order Tgl: ${lastSavedInvoice.timeline.order}`, 5, 27);
    pdf.text(`Estimasi Selesai: ${lastSavedInvoice.timeline.estimasi}`, 5, 31);
    pdf.text(`Ekspedisi: ${lastSavedInvoice.logistik.kurir} / Resi: ${lastSavedInvoice.logistik.resi}`, 5, 35);
    pdf.text("--------------------------------------------------", 40, 40, { align: "center" });

    let y = 45;
    lastSavedInvoice.items.forEach(item => {
        pdf.text(`${item.nama_model} - ${item.warna} (${item.size})`, 5, y);
        pdf.text(`${item.qty} x Rp ${item.harga.toLocaleString("id-ID")} = Rp ${(item.qty * item.harga).toLocaleString("id-ID")}`, 5, y + 4);
        y += 9;
    });

    pdf.text("--------------------------------------------------", 40, y, { align: "center" });
    pdf.setFontSize(8);
    pdf.text(`GRAND TOTAL: Rp ${lastSavedInvoice.keuangan.grandTotal.toLocaleString("id-ID")}`, 5, y + 5);
    pdf.text(`Metode: ${lastSavedInvoice.keuangan.metodeBayar}`, 5, y + 9);
    pdf.text(`Bayar: Rp ${lastSavedInvoice.keuangan.nominalBayar.toLocaleString("id-ID")}`, 5, y + 13);

    pdf.setFontSize(6);
    pdf.text("Terima kasih telah melakukan pre-order.", 40, y + 20, { align: "center" });
    pdf.save(`Struk_Clothvers_${lastSavedInvoice.timestamp}.pdf`);
}

function kirimWhatsAppStrukLast() {
    if (!lastSavedInvoice) return;
    
    let text = `*NOTA TRANSAKSI CLOTHVERS SYSTEM*\n`;
    text += `Pelanggan: ${lastSavedInvoice.customer.nama}\n`;
    text += `Tanggal Order: ${lastSavedInvoice.timeline.order}\n`;
    text += `Estimasi Selesai PO: ${lastSavedInvoice.timeline.estimasi}\n`;
    text += `Kurir: ${lastSavedInvoice.logistik.kurir} [Resi: ${lastSavedInvoice.logistik.resi}]\n`;
    text += `=========================\n`;

    lastSavedInvoice.items.forEach((item, i) => {
        text += `${i+1}. ${item.nama_model} - ${item.warna} [Size ${item.size}]\n`;
        text += `   Qty: ${item.qty} x Rp ${item.harga.toLocaleString("id-ID")} = Rp ${(item.qty*item.harga).toLocaleString("id-ID")}\n`;
    });

    text += `=========================\n`;
    text += `*GRAND TOTAL TAGIHAN:* Rp ${lastSavedInvoice.keuangan.grandTotal.toLocaleString("id-ID")}\n`;
    text += `Metode Pembayaran: ${lastSavedInvoice.keuangan.metodeBayar}\n`;
    text += `Status: Diproses Masuk Sistem Antrean Produksi.\n\n`;
    text += `_Made in by Clothvers x Elevatio_`;

    const url = `https://wa.me/${lastSavedInvoice.customer.hp}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
}

// ==========================================
// F. LOGIKA MODULE D: CRM LOG PELANGGAN
// ==========================================
function hapusCustomer(id) {
    if (!confirm("Hapus customer ini dari database?")) return;
    const trans = db.transaction(["store_customer"], "readwrite");
    trans.objectStore("store_customer").delete(id);
    trans.oncomplete = function() { loadSemuaDataKeTabel(); };
}

// ==========================================
// G. LOGIKA MODULE E: RETUR & INVENTARIS
// ==========================================
function simpanRetur() {
    const item = document.getElementById("retur-nama-item")?.value.trim();
    const jenis = document.getElementById("retur-jenis")?.value;
    const rugi = parseFloat(document.getElementById("retur-kerugian")?.value) || 0;

    if (!item) return;

    const payload = { item, jenis, kerugian: rugi, timestamp: new Date().getTime() };
    const trans = db.transaction(["store_retur_reject", "store_jurnal_akuntansi"], "readwrite");
    trans.objectStore("store_retur_reject").add(payload);

    // Masuk Otomatis mengurangi pencatatan akuntansi keuangan
    trans.objectStore("store_jurnal_akuntansi").add({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: `Beban Retur / Cacat: ${item} (${jenis})`,
        tipe: "KELUAR_BEBAN_RETUR",
        nominal: rugi,
        timestamp: new Date().getTime()
    });

    trans.oncomplete = function() {
        alert("Log Kerusakan & Retur Berhasil Masuk Jurnal Akuntansi.");
        document.getElementById("retur-nama-item").value = "";
        loadSemuaDataKeTabel();
    };
}

function hapusRetur(id) {
    if (!confirm("Hapus log retur ini?")) return;
    const trans = db.transaction(["store_retur_reject"], "readwrite");
    trans.objectStore("store_retur_reject").delete(id);
    trans.oncomplete = function() { loadSemuaDataKeTabel(); };
}

function simpanInventaris() {
    const nama = document.getElementById("inv-nama")?.value.trim();
    const harga = parseFloat(document.getElementById("inv-harga-beli")?.value) || 0;
    const masa = parseFloat(document.getElementById("inv-masa-manfaat")?.value) || 1;

    if (!nama) return;

    const susutBulanan = harga / masa;
    const payload = { nama, harga_beli: harga, masa_manfaat: masa, penyusutan_bulanan: susutBulanan };
    
    const trans = db.transaction(["store_inventaris", "store_jurnal_akuntansi"], "readwrite");
    trans.objectStore("store_inventaris").add(payload);

    // Otomatis bebankan penyusutan bulan pertama ke keuangan
    trans.objectStore("store_jurnal_akuntansi").add({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: `Amortisasi Penyusutan Bulanan: ${nama}`,
        tipe: "KELUAR_PENYUSUTAN",
        nominal: susutBulanan,
        timestamp: new Date().getTime()
    });

    trans.oncomplete = function() {
        alert("Aset Berhasil Disimpan & Biaya Amortisasi Bulanan Terpotong.");
        document.getElementById("inv-nama").value = "";
        loadSemuaDataKeTabel();
    };
}

function hapusInventaris(id) {
    if (!confirm("Hapus data aset inventaris ini?")) return;
    const trans = db.transaction(["store_inventaris"], "readwrite");
    trans.objectStore("store_inventaris").delete(id);
    trans.oncomplete = function() { loadSemuaDataKeTabel(); };
}

// ==========================================
// H. LOGIKA MODULE F: AKUNTANSI & SUB-FILTER
// ==========================================
function setFilterJurnal(tipe) {
    filterJurnalAktif = tipe;
    ["hari", "minggu", "bulan", "tahun"].forEach(t => {
        const btn = document.getElementById(`fj-${t}`);
        if (btn) {
            btn.classList.remove("bg-white", "text-[#1E293B]");
            btn.classList.add("text-gray-500");
        }
    });
    const activeBtn = document.getElementById(`fj-${tipe.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-gray-500");
        activeBtn.classList.add("bg-white", "text-[#1E293B]");
    }
    renderTabelJurnalSaja();
}

// ==========================================
// I. DATA RETRIEVAL & RENDER DOM ENGINE
// ==========================================
function loadSemuaDataKeTabel() {
    if (!db) return;

    // Reset Semua Element Select di POS & HPP
    const selectHppModel = document.getElementById("hpp-select-model");
    const selectPosModel = document.getElementById("pos-select-produk");
    if (selectHppModel) selectHppModel.innerHTML = "";
    if (selectPosModel) selectPosModel.innerHTML = "";

    // 1. Ambil Data Master Produk
    const tbodyProduk = document.getElementById("table-body-produk");
    if (tbodyProduk) tbodyProduk.innerHTML = "";

    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const rowData = cursor.value;

            // Isi dropdown seleksi model
            if (selectHppModel) {
                const opt = document.createElement("option");
                opt.value = rowData.id; opt.innerText = rowData.nama_model;
                selectHppModel.appendChild(opt);
            }
            if (selectPosModel) {
                const opt = document.createElement("option");
                opt.value = rowData.id; opt.innerText = rowData.nama_model;
                selectPosModel.appendChild(opt);
            }

            // Render ke tabel master
            if (tbodyProduk) {
                let varianHTML = "";
                // Anti-TypeError Guard via Optional Chaining & Fallback
                const matriks = rowData?.matriks_varian || [];
                matriks.forEach(v => {
                    if (v.stok > 0 || v.hpp_varian > 0) {
                        varianHTML += `
                            <span class="inline-block bg-gray-100 text-[11px] p-1.5 rounded-md m-0.5 text-gray-700">
                                <b>${v.warna} [${v.size}]</b>: Stok:${v.stok} | HPP:Rp ${v.hpp_varian.toLocaleString("id-ID")} | Jual:Rp ${v.jual_varian.toLocaleString("id-ID")} <br>
                                Fit: Dimensi ${v.wh}x${v.ht}cm (TB:${v.tb_min}-${v.tb_max}cm | BB:${v.bb_min}-${v.bb_max}kg)
                            </span><br>
                        `;
                    }
                });

                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100";
                tr.innerHTML = `
                    <td class="p-3 font-bold text-[#0F172A]">${rowData.nama_model}</td>
                    <td class="p-3 text-gray-500 font-medium">${rowData.jenis_kain} (${rowData.tipe_kain_gsm} GSM)<br><span class="text-[11px] text-gray-400">${rowData.detail_produksi}</span></td>
                    <td class="p-3">${varianHTML || '<span class="text-gray-400 text-xs">Belum ada matriks terisi</span>'}</td>
                    <td class="p-3 text-center"><button onclick="hapusProduk(${rowData.id})" class="text-rose-600 font-bold hover:underline">Hapus</button></td>
                `;
                tbodyProduk.appendChild(tr);
            }
            cursor.continue();
        } else {
            // Setelah produk terisi, sinkronisasikan nilai form HPP & POS varian pertama kali
            syncHppKainOtomatis();
            renderPosVarianPilihan();
        }
    };

    // 2. Ambil Data Log HPP
    const tbodyHpp = document.getElementById("table-body-hpp");
    if (tbodyHpp) tbodyHpp.innerHTML = "";
    db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            if (tbodyHpp) {
                const data = cursor.value;
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 text-xs font-medium";
                tr.innerHTML = `
                    <td class="p-3 font-bold text-[#0F172A]">${data.nama_model} (${data.size_terpilih})</td>
                    <td class="p-3 font-black text-emerald-700 text-sm">Rp ${data.hpp_total?.toLocaleString("id-ID")}</td>
                    <td class="p-3 text-gray-400">Kain: ${data.biaya_kain_otomatis} | Jahit: ${data.ongkos_jahit} | Sablon: ${data.aplikasi_sablon} | Pack: ${data.packaging} | Margin: ${data.margin_percent}%</td>
                    <td class="p-3">
                        WA: Rp ${data.harga_jual_channels?.wa?.toLocaleString("id-ID")} | Shopee: Rp ${data.harga_jual_channels?.shopee?.toLocaleString("id-ID")} | TikTok: Rp ${data.harga_jual_channels?.tiktok?.toLocaleString("id-ID")}
                    </td>
                    <td class="p-3 text-center"><button onclick="hapusHpp(${data.id})" class="text-rose-600 font-bold hover:underline">Hapus</button></td>
                `;
                tbodyHpp.appendChild(tr);
            }
            cursor.continue();
        }
    };

    // 3. Ambil Data CRM Customer
    const tbodyCust = document.getElementById("table-body-customer");
    if (tbodyCust) tbodyCust.innerHTML = "";
    db.transaction(["store_customer"], "readonly").objectStore("store_customer").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            if (tbodyCust) {
                const data = cursor.value;
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 font-medium";
                tr.innerHTML = `
                    <td class="p-3 text-gray-400 text-xs">${data.tanggal_terdaftar}</td>
                    <td class="p-3 font-bold text-[#0F172A]">${data.nama_customer}</td>
                    <td class="p-3 text-indigo-600 font-bold">${data.nomor_hp}</td>
                    <td class="p-3 text-right font-black text-emerald-600">Rp ${data.total_transaksi?.toLocaleString("id-ID")}</td>
                    <td class="p-3 text-center"><button onclick="hapusCustomer(${data.id})" class="text-rose-600 text-xs font-bold hover:underline">Hapus</button></td>
                `;
                tbodyCust.appendChild(tr);
            }
            cursor.continue();
        }
    };

    // 4. Ambil Data Retur & Cacat
    const tbodyRetur = document.getElementById("table-body-retur");
    if (tbodyRetur) tbodyRetur.innerHTML = "";
    db.transaction(["store_retur_reject"], "readonly").objectStore("store_retur_reject").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            if (tbodyRetur) {
                const data = cursor.value;
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 font-medium";
                tr.innerHTML = `
                    <td class="p-2 text-[#0F172A]">${data.item}</td>
                    <td class="p-2 text-amber-600 font-bold">${data.jenis}</td>
                    <td class="p-2 text-right text-rose-600 font-bold">Rp ${data.kerugian?.toLocaleString("id-ID")}</td>
                    <td class="p-2 text-center"><button onclick="hapusRetur(${data.id})" class="text-rose-600 hover:underline">X</button></td>
                `;
                tbodyRetur.appendChild(tr);
            }
            cursor.continue();
        }
    };

    // 5. Ambil Data Inventaris Alat
    const tbodyInv = document.getElementById("table-body-inventaris");
    if (tbodyInv) tbodyInv.innerHTML = "";
    db.transaction(["store_inventaris"], "readonly").objectStore("store_inventaris").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            if (tbodyInv) {
                const data = cursor.value;
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-100 font-medium";
                tr.innerHTML = `
                    <td class="p-2 text-[#0F172A]">${data.nama} (x${data.masa_manfaat} Bln)</td>
                    <td class="p-2 text-right text-gray-500">Rp ${data.harga_beli?.toLocaleString("id-ID")}</td>
                    <td class="p-2 text-right text-rose-600 font-bold">Rp ${Math.round(data.penyusutan_bulanan)?.toLocaleString("id-ID")}</td>
                    <td class="p-2 text-center"><button onclick="hapusInventaris(${data.id})" class="text-rose-600 hover:underline">X</button></td>
                `;
                tbodyInv.appendChild(tr);
            }
            cursor.continue();
        }
    };

    // Render Jurnal Akuntansi Sekaligus Hitung Akumulasi Kotak Ringkasan Keuangan
    renderTabelJurnalSaja();
}

function renderTabelJurnalSaja() {
    const tbodyJurnal = document.getElementById("table-body-jurnal");
    if (!tbodyJurnal) return;
    tbodyJurnal.innerHTML = "";

    let totalOmset = 0;
    let totalDp = 0;
    let totalPiutang = 0;
    let totalBeban = 0;

    const filterTahunGlobal = document.getElementById("global-filter-periode")?.value || "2026";

    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const data = cursor.value;

            // Logika Penyaringan Filter Tahun Jangka Panjang Komparatif s.d 2030
            if (data.tanggal && data.tanggal.includes(filterTahunGlobal)) {
                
                // Kalkulasi Nilai Akumulasi Box Keuangan atas data yang lolos filter tahun
                if (data.tipe === "MASUK_OMSET") totalOmset += data.nominal;
                if (data.tipe === "MASUK_DP") totalDp += data.nominal;
                if (data.tipe === "PIUTANG_BARU") totalPiutang += data.nominal;
                if (data.tipe === "KELUAR_BEBAN_RETUR" || data.tipe === "KELUAR_PENYUSUTAN") totalBeban += data.nominal;

                // Logika Filter Rentang Sub-Waktu Waktu Jurnal (Hari, Minggu, Bulan)
                let lolosSubFilter = true;
                const tglData = new Date(data.tanggal);
                const hariIni = new Date();

                if (filterJurnalAktif === "HARI") {
                    if (data.tanggal !== hariIni.toISOString().split('T')[0]) lolosSubFilter = false;
                } else if (filterJurnalAktif === "MINGGU") {
                    const selisihWaktu = Math.abs(hariIni - tglData);
                    const selisihHari = Math.ceil(selisihWaktu / (1000 * 60 * 60 * 24));
                    if (selisihHari > 7) lolosSubFilter = false;
                } else if (filterJurnalAktif === "BULAN") {
                    if (tglData.getMonth() !== hariIni.getMonth() || tglData.getFullYear() !== hariIni.getFullYear()) lolosSubFilter = false;
                }

                if (lolosSubFilter) {
                    const tr = document.createElement("tr");
                    tr.className = "border-b border-gray-100 font-medium text-xs";
                    
                    let warnaTipe = "text-emerald-600 bg-emerald-50";
                    if (data.tipe.startsWith("KELUAR")) warnaTipe = "text-rose-600 bg-rose-50";
                    if (data.tipe.startsWith("PIUTANG")) warnaTipe = "text-amber-600 bg-amber-50";

                    tr.innerHTML = `
                        <td class="p-3 text-gray-400">${data.tanggal}</td>
                        <td class="p-3 font-bold text-[#0F172A]">${data.kclean || data.keterangan}</td>
                        <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-black ${warnaTipe}">${data.tipe}</span></td>
                        <td class="p-3 text-right font-black text-sm text-[#0F172A]">Rp ${data.nominal?.toLocaleString("id-ID")}</td>
                        <td class="p-3 text-center"><button onclick="hapusJurnal(${data.id})" class="text-rose-600 font-bold hover:underline">Hapus</button></td>
                    `;
                    tbodyJurnal.appendChild(tr);
                }
            }
            cursor.continue();
        } else {
            // Render Hasil Penghitungan Akumulasi Finansial Akhir ke UI
            document.getElementById("acc-omset").innerText = "Rp " + totalOmset.toLocaleString("id-ID");
            document.getElementById("acc-dp").innerText = "Rp " + totalDp.toLocaleString("id-ID");
            document.getElementById("acc-piutang").innerText = "Rp " + totalPiutang.toLocaleString("id-ID");
            document.getElementById("acc-beban").innerText = "Rp " + totalBeban.toLocaleString("id-ID");
        }
    };
}

function hapusJurnal(id) {
    if (!confirm("Hapus record finansial ini secara paksa?")) return;
    const trans = db.transaction(["store_jurnal_akuntansi"], "readwrite");
    trans.objectStore("store_jurnal_akuntansi").delete(id);
    trans.oncomplete = function() { loadSemuaDataKeTabel(); };
}

// ==========================================
// J. EKSPOR LAPORAN PDF KOLEKTIF & EXCEL CSV
// ==========================================
function downloadPDFStok() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Kolektif Master Inventori Pakaian - Clothvers System", 14, 15);
    
    let rows = [];
    db.transaction(["store_produk"], "readonly").objectStore("store_produk").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const p = cursor.value;
            let detailVarianStr = "";
            (p.matriks_varian || []).forEach(v => {
                if(v.stok > 0) detailVarianStr += `${v.warna}(${v.size}): S:${v.stok} | HPP:${v.hpp_varian}\n`;
            });
            rows.push([p.nama_model, `${p.jenis_kain} (${p.tipe_kain_gsm} GSM)`, p.detail_produksi, detailVarianStr]);
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Nama Model', 'Bahan Kain', 'Detail Kerja', 'Matriks Ukuran']],
                body: rows,
                startY: 22
            });
            doc.save("Laporan_Master_Stok_Clothvers.pdf");
        }
    };
}

function downloadPDFHpp() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Komparatif Harga Pokok Penjualan (HPP)", 14, 15);
    let rows = [];
    db.transaction(["store_hpp"], "readonly").objectStore("store_hpp").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const h = cursor.value;
            rows.push([h.nama_model, h.size_terpilih, `Rp ${h.hpp_total}`, `WA: ${h.harga_jual_channels?.wa} | Shopee: ${h.harga_jual_channels?.shopee}`]);
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Model Pakaian', 'Size', 'HPP Kumulatif', 'Skema Jual']],
                body: rows,
                startY: 22
            });
            doc.save("Laporan_Finansial_HPP_Clothvers.pdf");
        }
    };
}

function downloadPDFCustomer() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Database Log Hub Pelanggan CRM - Clothvers", 14, 15);
    let rows = [];
    db.transaction(["store_customer"], "readonly").objectStore("store_customer").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const c = cursor.value;
            rows.push([c.tanggal_terdaftar, c.nama_customer, c.nomor_hp, `Rp ${c.total_transaksi}`]);
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Tgl Terdaftar', 'Nama Pelanggan', 'No Handphone', 'Total Belanja']],
                body: rows,
                startY: 22
            });
            doc.save("Database_Customer_Clothvers.pdf");
        }
    };
}

function downloadPDFJurnal() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Buku Besar Jurnal Akuntansi Keuangan Kumulatif", 14, 15);
    let rows = [];
    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const j = cursor.value;
            rows.push([j.tanggal, j.keterangan, j.tipe, `Rp ${j.nominal}`]);
            cursor.continue();
        } else {
            doc.autoTable({
                head: [['Tanggal', 'Keterangan Sumber', 'Tipe Aliran', 'Nominal Transaksi']],
                body: rows,
                startY: 22
            });
            doc.save("Buku_Jurnal_Akuntansi_Clothvers.pdf");
        }
    };
}

function eksporCSVJurnal() {
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Keterangan,Tipe,Nominal\n";
    db.transaction(["store_jurnal_akuntansi"], "readonly").objectStore("store_jurnal_akuntansi").openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            const j = cursor.value;
            csvContent += `${j.tanggal},"${j.keterangan}",${j.tipe},${j.nominal}\n`;
            cursor.continue();
        } else {
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "Jurnal_Akuntansi_Clothvers.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
}

// ==========================================
// K. BACKUP JSON & RESTORE SYNC BRIDGE PANEL
// ==========================================
function backupIndexedDBToJSON() {
    let backupData = {};
    let counter = 0;

    APP_STORES.forEach(storeName => {
        let storeData = [];
        db.transaction([storeName], "readonly").objectStore(storeName).openCursor().onsuccess = function(e) {
            const cursor = e.target.result;
            if (cursor) {
                storeData.push(cursor.value);
                cursor.continue();
            } else {
                backupData[storeName] = storeData;
                counter++;
                if (counter === APP_STORES.length) {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `Backup_ClothversDB_Full_${new Date().getTime()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    alert("Seluruh isi database IndexedDB berhasil diekstrak ke berkas fisik JSON.");
                }
            }
        };
    });
}

function restoreJSONToIndexedDB() {
    const fileInput = document.getElementById("restore-file-input");
    const file = fileInput?.files[0];

    if (!file) {
        alert("Pilih file berkas cadangan .json terlebih dahulu.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            let counter = 0;

            APP_STORES.forEach(storeName => {
                const trans = db.transaction([storeName], "readwrite");
                const store = trans.objectStore(storeName);
                
                // Kosongkan data lama terlebih dahulu agar tidak terjadi duplikasi keyPath
                store.clear();

                const records = parsedData[storeName] || [];
                records.forEach(rec => {
                    store.add(rec);
                });

                trans.oncomplete = function() {
                    counter++;
                    if (counter === APP_STORES.length) {
                        alert("Restorasi & Sinkronisasi Luring Selesai. Seluruh data diperbarui!");
                        loadSemuaDataKeTabel();
                    }
                };
            });
        } catch (err) {
            alert("File JSON rusak atau tidak sesuai dengan skema ClothversDB.");
        }
    };
    reader.readAsText(file);
}
