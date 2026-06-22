/**
 * CLOTHVERS SYSTEM v1.0 - CORE ENGINE JS
 * Arsitektur Integrasi Real-Time IndexedDB s.d 2030+
 */

let db = null;
let currentActiveModule = 'stok';
let tempCartDataArray = []; // Wadah Penampung Sementara Keranjang Kasir POS Multi-Item

// 1. INISIALISASI UTAMA & EVENT BINDING DATABASE INDEXEDDB
window.addEventListener('DOMContentLoaded', () => {
  initClothversIndexedDB();
  setDefaultFilterDate();
});

function initClothversIndexedDB() {
  const request = indexedDB.open('ClothversDB', 1);

  request.onupgradeneeded = (e) => {
    const databaseRef = e.target.result;
    
    // Pembuatan 7 Object Stores Esensial
    if (!databaseRef.objectStoreNames.contains('store_produk')) {
      databaseRef.createObjectStore('store_produk', { keyPath: 'id', autoIncrement: true });
    }
    if (!databaseRef.objectStoreNames.contains('store_hpp')) {
      databaseRef.createObjectStore('store_hpp', { keyPath: 'id', autoIncrement: true });
    }
    if (!databaseRef.objectStoreNames.contains('store_transaksi')) {
      databaseRef.createObjectStore('store_transaksi', { keyPath: 'id', autoIncrement: true });
    }
    if (!databaseRef.objectStoreNames.contains('store_jurnal_akuntansi')) {
      databaseRef.createObjectStore('store_jurnal_akuntansi', { keyPath: 'id', autoIncrement: true });
    }
    if (!databaseRef.objectStoreNames.contains('store_retur_reject')) {
      databaseRef.createObjectStore('store_retur_reject', { keyPath: 'id', autoIncrement: true });
    }
    if (!databaseRef.objectStoreNames.contains('store_inventaris')) {
      databaseRef.createObjectStore('store_inventaris', { keyPath: 'id', autoIncrement: true });
    }
    if (!databaseRef.objectStoreNames.contains('store_customer')) {
      databaseRef.createObjectStore('store_customer', { keyPath: 'id', autoIncrement: true });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    console.log('Database ClothversDB Terhubung Berhasil.');
    // Ambil render data awal dari database
    renderAllDataModules();
  };

  request.onerror = (e) => {
    console.error('Database Gagal Terbuka:', e.target.error);
    alert('Akses database internal ditolak browser. Periksa izin luring Anda.');
  };
}

// FORMAT RUPIAH FORMATTER
function formatRupiahCur(num) {
  const cleanNum = parseInt(num) || 0;
  return 'Rp ' + cleanNum.toLocaleString('id-ID');
}

// SET FILTER GLOBAL PERIODE DEFAULT SEKARANG
function setDefaultFilterDate() {
  const dateObj = new Date();
  const arrBulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  
  const elementBln = document.getElementById('global-bulan');
  const elementThn = document.getElementById('global-tahun');
  
  if(elementBln) elementBln.value = arrBulan[dateObj.getMonth()];
  if(elementThn) elementThn.value = String(dateObj.getFullYear());
}

function triggerGlobalFilter() {
  renderAllDataModules();
}

// NAVIGATION SPA ENGINE & DRAWER HANDLER
function switchModule(modId) {
  currentActiveModule = modId;
  
  // Sembunyikan seluruh modul
  document.querySelectorAll('.module-view').forEach(elem => elem.classList.add('hidden'));
  
  // Tampilkan modul aktif
  const activeTarget = document.getElementById(`modul-${modId}`);
  if(activeTarget) activeTarget.classList.remove('hidden');

  // Ganti Header Teks Title Utama
  const txtTitle = document.getElementById('current-module-title');
  if(txtTitle) {
    const titles = {
      stok: 'Dashboard Input Stok Pakaian',
      hpp: 'Manajemen HPP & Simulasi Harga Jual',
      pos: 'Terminal POS Kasir & Transaksi Multi-Item',
      customer: 'Database Customer CRM Log',
      retur: 'Modul Retur & Barang Cacat (Reject)',
      inventaris: 'Inventaris Alat Kerja & Depresiasi',
      akuntansi: 'Akuntansi & Buku Besar Keuangan Jurnal',
      backup: 'Database Local Sync Bridge & Backup Panel'
    };
    txtTitle.innerText = titles[modId] || 'Clothvers System';
  }

  // Update Highlight Tombol Sidebar Desktop
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-white/10', 'text-white');
    btn.classList.add('text-gray-400', 'hover:bg-white/5');
  });
  const currentNav = document.getElementById(`nav-${modId}`);
  if(currentNav) {
    currentNav.classList.remove('text-gray-400', 'hover:bg-white/5');
    currentNav.classList.add('bg-white/10', 'text-white');
  }

  // Update Highlight Bottom Bar Mobile
  document.querySelectorAll('nav.md\\:hidden button').forEach(btn => {
    btn.classList.remove('text-emerald-400');
    btn.classList.add('text-gray-400');
  });
  const currentMbNav = document.getElementById(`mb-${modId}`);
  if(currentMbNav) currentMbNav.classList.add('text-emerald-400');

  renderAllDataModules();
}

function toggleTabletDrawer() {
  const drawer = document.getElementById('tablet-drawer');
  if(drawer) drawer.classList.toggle('hidden');
}

// WRAPPER INTEGRASI RE-RENDER MASSAL
function renderAllDataModules() {
  if(!db) return;
  renderStokModul();
  renderHppModul();
  renderPosModul();
  renderCustomerModul();
  renderReturInventarisModul();
  renderAkuntansiModul();
}

// =======================================================
// 📦 LOGIKA DASHBOARD A: INPUT STOK PAKAIAN (ANTI TYPEERROR)
// =======================================================
let currentWarnaArrayTemp = [];

function addWarnaToMatrix() {
  const inputWarna = document.getElementById('input-warna-nama');
  const warnaValue = inputWarna?.value?.trim();

  if(!warnaValue) {
    alert('Nama warna tidak boleh kosong.');
    return;
  }

  if(currentWarnaArrayTemp.includes(warnaValue)) {
    alert('Warna tersebut sudah ditambahkan dalam matriks.');
    return;
  }

  currentWarnaArrayTemp.push(warnaValue);
  if(inputWarna) inputWarna.value = '';
  rebuildMatrixUI();
}

function rebuildMatrixUI() {
  const container = document.getElementById('matrix-container');
  if(!container) return;
  container.innerHTML = '';

  if(currentWarnaArrayTemp.length === 0) {
    container.innerHTML = `<p class="text-xs font-medium text-gray-400">Belum ada varian warna yang ditambahkan.</p>`;
    return;
  }

  // Pengamanan Anti-TypeError: Loop Varian Ukuran S - 2XL Kokoh
  const staticSizes = ['S', 'M', 'L', 'XL', '2XL'];

  currentWarnaArrayTemp.forEach((warna) => {
    const cardWarnaBlock = document.createElement('div');
    cardWarnaBlock.className = "bg-white p-4 rounded-xl border border-gray-200 shadow-xs relative space-y-3";
    
    cardWarnaBlock.innerHTML = `
      <div class="flex justify-between items-center border-b border-gray-100 pb-2">
        <span class="text-xs font-black text-[#0F172A] tracking-wide uppercase">🎨 Varian Warna: ${warna}</span>
        <button type="button" onclick="removeWarnaFromMatrix('${warna}')" class="text-xs text-red-600 font-bold hover:underline">Hapus Blok Warna</button>
      </div>
      <div class="w-full overflow-x-auto block whitespace-nowrap">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="text-gray-500 font-bold border-b border-gray-100">
              <th class="py-2 pr-2">Size</th>
              <th class="py-2 px-2 w-20">Stok</th>
              <th class="py-2 px-2">HPP Varian Asli (Rp)</th>
              <th class="py-2 px-2">Harga Jual (Rp)</th>
              <th class="py-2 px-2 w-16">WH</th>
              <th class="py-2 px-2 w-16">HT</th>
              <th class="py-2 px-2 w-16">TB</th>
              <th class="py-2 pl-2">BB Rec (kg)</th>
            </tr>
          </thead>
          <tbody id="tbody-matrix-${warna.replace(/\s+/g, '_')}">
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(cardWarnaBlock);
    const tbody = document.getElementById(`tbody-matrix-${warna.replace(/\s+/g, '_')}`);

    staticSizes.forEach((size) => {
      const tr = document.createElement('tr');
      tr.className = "border-b border-gray-50 align-middle";
      tr.innerHTML = `
        <td class="py-2 pr-2 font-bold text-[#0F172A]">${size}</td>
        <td class="py-2 px-1"><input type="number" required data-warna="${warna}" data-size="${size}" class="m-stok w-full border border-gray-200 rounded p-1 text-center font-bold" value="0"></td>
        <td class="py-2 px-1"><input type="number" required data-warna="${warna}" data-size="${size}" class="m-hpp w-full border border-gray-200 rounded p-1 font-bold" value="0"></td>
        <td class="py-2 px-1"><input type="number" required data-warna="${warna}" data-size="${size}" class="m-jual w-full border border-gray-200 rounded p-1 font-bold" value="0"></td>
        <td class="py-2 px-1"><input type="number" data-warna="${warna}" data-size="${size}" class="m-wh w-full border border-gray-200 rounded p-1 text-center" value="0"></td>
        <td class="py-2 px-1"><input type="number" data-warna="${warna}" data-size="${size}" class="m-ht w-full border border-gray-200 rounded p-1 text-center" value="0"></td>
        <td class="py-2 px-1"><input type="number" data-warna="${warna}" data-size="${size}" class="m-tb w-full border border-gray-200 rounded p-1 text-center" value="0"></td>
        <td class="py-2 pl-1"><input type="text" data-warna="${warna}" data-size="${size}" class="m-bb w-full border border-gray-200 rounded p-1 text-center" placeholder="45-55"></td>
      `;
      tbody?.appendChild(tr);
    });
  });
}

function removeWarnaFromMatrix(warna) {
  currentWarnaArrayTemp = currentWarnaArrayTemp.filter(w => w !== warna);
  rebuildMatrixUI();
}

function saveProdukHandler(e) {
  e.preventDefault();
  if(!db) return;

  const idVal = document.getElementById('stok-id')?.value;
  const nama_model = document.getElementById('nama_model')?.value;
  const jenis_kain = document.getElementById('jenis_kain')?.value;
  const tipe_kain_gsm = document.getElementById('tipe_kain_gsm')?.value;
  const detail_production = document.getElementById('detail_production')?.value;

  // Bangun struktur data matriks varian dari tabel input HTML
  const finalMatriksVarian = [];

  // Ambil semua input stok untuk memetakan padanan warna + size
  const inputStokRefs = document.querySelectorAll('.m-stok');
  const inputHppRefs = document.querySelectorAll('.m-hpp');
  const inputJualRefs = document.querySelectorAll('.m-jual');
  const inputWhRefs = document.querySelectorAll('.m-wh');
  const inputHtRefs = document.querySelectorAll('.m-ht');
  const inputTbRefs = document.querySelectorAll('.m-tb');
  const inputBbRefs = document.querySelectorAll('.m-bb');

  for (let i = 0; i < inputStokRefs.length; i++) {
    const w = inputStokRefs[i].getAttribute('data-warna');
    const s = inputStokRefs[i].getAttribute('data-size');

    finalMatriksVarian.push({
      warna: w,
      size: s,
      stok: parseInt(inputStokRefs[i]?.value) || 0,
      hpp_varian: parseInt(inputHppRefs[i]?.value) || 0,
      jual_varian: parseInt(inputJualRefs[i]?.value) || 0,
      wh: parseInt(inputWhRefs[i]?.value) || 0,
      ht: parseInt(inputHtRefs[i]?.value) || 0,
      tb: parseInt(inputTbRefs[i]?.value) || 0,
      bb_rec: inputBbRefs[i]?.value || ""
    });
  }

  const payload = {
    nama_model,
    jenis_kain,
    tipe_kain_gsm,
    detail_produksi: detail_production,
    matriks_varian: finalMatriksVarian,
    bulan: document.getElementById('global-bulan')?.value,
    tahun: document.getElementById('global-tahun')?.value
  };

  const tx = db.transaction('store_produk', 'readwrite');
  const store = tx.objectStore('store_produk');

  if(idVal) {
    payload.id = parseInt(idVal);
    store.put(payload);
  } else {
    store.add(payload);
  }

  tx.oncomplete = () => {
    alert('Master Data Stok Pakaian Berhasil Disimpan.');
    resetFormStok();
    renderAllDataModules();
  };
}

function resetFormStok() {
  document.getElementById('stok-id').value = '';
  document.getElementById('form-stok').reset();
  currentWarnaArrayTemp = [];
  rebuildMatrixUI();
}

function renderStokModul() {
  const tbody = document.getElementById('tbody-stok');
  if(!tbody) return;

  const tx = db.transaction('store_produk', 'readonly');
  const store = tx.objectStore('store_produk');
  const req = store.getAll();

  req.onsuccess = () => {
    const list = req.result || [];
    // Filter berdasarkan Dropdown Periode Global
    const fBulan = document.getElementById('global-bulan')?.value;
    const fTahun = document.getElementById('global-tahun')?.value;
    
    const filteredList = list.filter(item => item?.bulan === fBulan && item?.tahun === fTahun);

    tbody.innerHTML = '';
    if(filteredList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-xs text-gray-400">Tidak ada produk konfeksi terdaftar pada periode ini.</td></tr>`;
      return;
    }

    filteredList.forEach(prod => {
      // Hitung akumulasi varian terdaftar secara aman menggunakan Optional Chaining
      const totalVarianCount = prod?.matriks_varian?.length || 0;

      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-50 border-b border-gray-100";
      tr.innerHTML = `
        <td class="p-4 font-bold text-[#0F172A]">${prod?.nama_model || '-'}</td>
        <td class="p-4 text-xs font-semibold text-gray-500">${prod?.jenis_kain || '-'} (${prod?.tipe_kain_gsm || '-'})</td>
        <td class="p-4 text-xs"><span class="bg-gray-100 border border-gray-200 font-bold rounded-lg px-2.5 py-1">${totalVarianCount} Sub-Ukuran</span></td>
        <td class="p-4 text-center space-x-2">
          <button onclick="editProduk(${prod.id})" class="text-xs font-bold text-[#0F172A] hover:underline">Edit</button>
          <button onclick="deleteDataGeneric('store_produk', ${prod.id})" class="text-xs font-bold text-red-600 hover:underline">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function editProduk(id) {
  const tx = db.transaction('store_produk', 'readonly');
  const store = tx.objectStore('store_produk');
  const req = store.get(id);

  req.onsuccess = () => {
    const p = req.result;
    if(!p) return;

    document.getElementById('stok-id').value = p.id;
    document.getElementById('nama_model').value = p.nama_model || '';
    document.getElementById('jenis_kain').value = p.jenis_kain || '';
    document.getElementById('tipe_kain_gsm').value = p.tipe_kain_gsm || '';
    document.getElementById('detail_production').value = p.detail_produksi || '';

    // Petakan ulang susunan blok warna lama secara aman
    const kumpWarna = [];
    p?.matriks_varian?.forEach(v => {
      if(v?.warna && !kumpWarna.includes(v.warna)) kumpWarna.push(v.warna);
    });

    currentWarnaArrayTemp = kumpWarna;
    rebuildMatrixUI();

    // Isi ulang nilai numerik dari tiap baris ukuran
    p?.matriks_varian?.forEach(v => {
      const queryStok = document.querySelector(`.m-stok[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryStok) queryStok.value = v.stok || 0;
      
      const queryHpp = document.querySelector(`.m-hpp[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryHpp) queryHpp.value = v.hpp_varian || 0;
      
      const queryJual = document.querySelector(`.m-jual[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryJual) queryJual.value = v.jual_varian || 0;

      const queryWh = document.querySelector(`.m-wh[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryWh) queryWh.value = v.wh || 0;

      const queryHt = document.querySelector(`.m-ht[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryHt) queryHt.value = v.ht || 0;

      const queryTb = document.querySelector(`.m-tb[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryTb) queryTb.value = v.tb || 0;

      const queryBb = document.querySelector(`.m-bb[data-warna="${v.warna}"][data-size="${v.size}"]`);
      if(queryBb) queryBb.value = v.bb_rec || "";
    });
  };
}

// =======================================================
// 📊 LOGIKA DASHBOARD B: MANAJEMEN HPP (SIMULASI PERSEN)
// =======================================================
let globalProdukCachedList = [];

function renderHppModul() {
  const selModel = document.getElementById('hpp_nama_model');
  if(!selModel) return;

  const tx = db.transaction('store_produk', 'readonly');
  const store = tx.objectStore('store_produk');
  const req = store.getAll();

  req.onsuccess = () => {
    globalProdukCachedList = req.result || [];
    
    // Simpan pilihan lama sebelum merender ulang opsi baru
    const preSelected = selModel.value;
    selModel.innerHTML = '<option value="">-- Pilih Model Pakaian --</option>';

    globalProdukCachedList.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.nama_model;
      opt.innerText = p.nama_model;
      selModel.appendChild(opt);
    });

    if(preSelected) selModel.value = preSelected;
    syncHppModelSelect();
    refreshHppLogTable();
  };
}

function syncHppModelSelect() {
  const modelName = document.getElementById('hpp_nama_model')?.value;
  const selSize = document.getElementById('hpp_size_terpilih');
  if(!selSize) return;

  selSize.innerHTML = '';
  const matchProd = globalProdukCachedList.find(p => p.nama_model === modelName);

  if(!matchProd) {
    calculateLiveHppTotal();
    return;
  }

  // Cari ukuran unik apa saja yang diinput pada data stok awal secara aman
  const sizesFound = [];
  matchProd?.matriks_varian?.forEach(v => {
    if(v?.size && !sizesFound.includes(v.size)) sizesFound.push(v.size);
  });

  sizesFound.forEach(sz => {
    const opt = document.createElement('option');
    opt.value = sz;
    opt.innerText = `Ukuran / Size: ${sz}`;
    selSize.appendChild(opt);
  });

  calculateLiveHppTotal();
}

function calculateLiveHppTotal() {
  const modelName = document.getElementById('hpp_nama_model')?.value;
  const sizeTerpilih = document.getElementById('hpp_size_terpilih')?.value;
  const inputBiayaKain = document.getElementById('hpp_biaya_kain_otomatis');

  let biayaKainAsli = 0;
  const matchProd = globalProdukCachedList.find(p => p.nama_model === modelName);

  if(matchProd && sizeTerpilih) {
    // Ambil nilai HPP Varian Asli dari entitas pertama yang cocok
    const subVarian = matchProd?.matriks_varian?.find(v => v.size === sizeTerpilih);
    biayaKainAsli = subVarian?.hpp_varian || 0;
  }

  if(inputBiayaKain) inputBiayaKain.value = biayaKainAsli;

  const oJahit = parseInt(document.getElementById('hpp_ongkos_jahit')?.value) || 0;
  const oSablon = parseInt(document.getElementById('hpp_sablon')?.value) || 0;
  const oPack = parseInt(document.getElementById('hpp_packaging')?.value) || 0;

  const hppTotal = biayaKainAsli + oJahit + oSablon + oPack;
  
  const displayHpp = document.getElementById('display-hpp-total');
  if(displayHpp) displayHpp.innerText = formatRupiahCur(hppTotal);

  // Ambil Persentase Manual dari User Form Input Marketplace Channels
  const waP = parseFloat(document.getElementById('p_wa')?.value) || 0;
  const shopeeP = parseFloat(document.getElementById('p_shopee')?.value) || 0;
  const tiktokP = parseFloat(document.getElementById('p_tiktok')?.value) || 0;
  const resellerP = parseFloat(document.getElementById('p_reseller')?.value) || 0;
  const grosirP = parseFloat(document.getElementById('p_grosir')?.value) || 0;

  // Hitung Nilai Jual = HPP + (HPP * Persen / 100)
  const calcPrice = (pct) => hppTotal + (hppTotal * pct / 100);

  const containerPreview = document.getElementById('channel-price-preview');
  if(containerPreview) {
    containerPreview.innerHTML = `
      <div class="bg-white p-2 rounded border border-gray-200">WA: ${formatRupiahCur(calcPrice(waP))}</div>
      <div class="bg-white p-2 rounded border border-gray-200">Shopee: ${formatRupiahCur(calcPrice(shopeeP))}</div>
      <div class="bg-white p-2 rounded border border-gray-200">TikTok: ${formatRupiahCur(calcPrice(tiktokP))}</div>
      <div class="bg-white p-2 rounded border border-gray-200">Reseller: ${formatRupiahCur(calcPrice(resellerP))}</div>
      <div class="bg-white p-2 rounded border border-gray-200">Grosir: ${formatRupiahCur(calcPrice(grosirP))}</div>
    `;
  }

  return hppTotal;
}

function saveHppHandler(e) {
  e.preventDefault();
  if(!db) return;

  const hppTotal = calculateLiveHppTotal();
  const idVal = document.getElementById('hpp-id')?.value;

  const waP = parseFloat(document.getElementById('p_wa')?.value) || 0;
  const shopeeP = parseFloat(document.getElementById('p_shopee')?.value) || 0;
  const tiktokP = parseFloat(document.getElementById('p_tiktok')?.value) || 0;
  const resellerP = parseFloat(document.getElementById('p_reseller')?.value) || 0;
  const grosirP = parseFloat(document.getElementById('p_grosir')?.value) || 0;

  const payload = {
    nama_model: document.getElementById('hpp_nama_model').value,
    size_terpilih: document.getElementById('hpp_size_terpilih').value,
    biaya_kain_otomatis: parseInt(document.getElementById('hpp_biaya_kain_otomatis').value) || 0,
    ongkos_jahit: parseInt(document.getElementById('hpp_ongkos_jahit').value) || 0,
    aplikasi_sablon: parseInt(document.getElementById('hpp_sablon').value) || 0,
    packaging: parseInt(document.getElementById('hpp_packaging').value) || 0,
    hpp_total: hppTotal,
    margin_percent: { wa: waP, shopee: shopeeP, tiktok: tiktokP, reseller: resellerP, grosir: grosirP },
    harga_jual_channels: {
      wa: hppTotal + (hppTotal * waP / 100),
      shopee: hppTotal + (hppTotal * shopeeP / 100),
      tiktok: hppTotal + (hppTotal * tiktokP / 100),
      reseller: hppTotal + (hppTotal * resellerP / 100),
      grosir: hppTotal + (hppTotal * grosirP / 100)
    },
    bulan: document.getElementById('global-bulan').value,
    tahun: document.getElementById('global-tahun').value
  };

  if(!payload.nama_model || !payload.size_terpilih) {
    alert('Silakan tentukan model & varian ukuran terlebih dahulu.');
    return;
  }

  const tx = db.transaction('store_hpp', 'readwrite');
  const store = tx.objectStore('store_hpp');

  if(idVal) {
    payload.id = parseInt(idVal);
    store.put(payload);
  } else {
    store.add(payload);
  }

  tx.oncomplete = () => {
    alert('Log Simulasi Manajemen Harga HPP Disimpan.');
    document.getElementById('hpp-id').value = '';
    document.getElementById('form-hpp').reset();
    renderAllDataModules();
  };
}

function refreshHppLogTable() {
  const tbody = document.getElementById('tbody-hpp');
  if(!tbody) return;

  const tx = db.transaction('store_hpp', 'readonly');
  const store = tx.objectStore('store_hpp');
  const req = store.getAll();

  req.onsuccess = () => {
    const list = req.result || [];
    const fBulan = document.getElementById('global-bulan')?.value;
    const fTahun = document.getElementById('global-tahun')?.value;
    const filteredList = list.filter(item => item?.bulan === fBulan && item?.tahun === fTahun);

    tbody.innerHTML = '';
    if(filteredList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-xs text-gray-400">Tidak ada log data HPP pada periode ini.</td></tr>`;
      return;
    }

    filteredList.forEach(h => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-50 border-b border-gray-100 align-middle";
      tr.innerHTML = `
        <td class="p-4 font-bold text-[#0F172A]">${h?.nama_model || '-'} (${h?.size_terpilih || '-'})</td>
        <td class="p-4">${formatRupiahCur(h?.biaya_kain_otomatis)}</td>
        <td class="p-4 text-emerald-800 font-bold">${formatRupiahCur(h?.hpp_total)}</td>
        <td class="p-4">${formatRupiahCur(h?.harga_jual_channels?.wa)}</td>
        <td class="p-4">${formatRupiahCur(h?.harga_jual_channels?.shopee)}</td>
        <td class="p-4">${formatRupiahCur(h?.harga_jual_channels?.tiktok)}</td>
        <td class="p-4">${formatRupiahCur(h?.harga_jual_channels?.reseller)}</td>
        <td class="p-4">${formatRupiahCur(h?.harga_jual_channels?.grosir)}</td>
        <td class="p-4 text-center space-x-2">
          <button onclick="editHpp(${h.id})" class="text-red-600 hover:underline">Edit</button>
          <button onclick="deleteDataGeneric('store_hpp', ${h.id})" class="text-red-600 hover:underline">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function editHpp(id) {
  const tx = db.transaction('store_hpp', 'readonly');
  const store = tx.objectStore('store_hpp');
  const req = store.get(id);

  req.onsuccess = () => {
    const h = req.result;
    if(!h) return;

    document.getElementById('hpp-id').value = h.id;
    document.getElementById('hpp_nama_model').value = h.nama_model || '';
    syncHppModelSelect();
    document.getElementById('hpp_size_terpilih').value = h.size_terpilih || '';
    document.getElementById('hpp_ongkos_jahit').value = h.ongkos_jahit || 0;
    document.getElementById('hpp_sablon').value = h.aplikasi_sablon || 0;
    document.getElementById('hpp_packaging').value = h.packaging || 0;

    // Fallback opsional chaining untuk mengantisipasi data kosong
    document.getElementById('p_wa').value = h?.margin_percent?.wa || 0;
    document.getElementById('p_shopee').value = h?.margin_percent?.shopee || 0;
    document.getElementById('p_tiktok').value = h?.margin_percent?.tiktok || 0;
    document.getElementById('p_reseller').value = h?.margin_percent?.reseller || 0;
    document.getElementById('p_grosir').value = h?.margin_percent?.grosir || 0;

    calculateLiveHppTotal();
  };
}

// =======================================================
// 🛒 LOGIKA DASHBOARD C: TERMINAL POS KASIR (MULTI-ITEM CART)
// =======================================================
let posProdukSource = [];

function renderPosModul() {
  const selModel = document.getElementById('pos_pilih_model');
  if(!selModel) return;

  const tx = db.transaction('store_produk', 'readonly');
  const store = tx.objectStore('store_produk');
  const req = store.getAll();

  req.onsuccess = () => {
    posProdukSource = req.result || [];
    selModel.innerHTML = '<option value="">-- Pilih Model --</option>';

    posProdukSource.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.nama_model;
      opt.innerText = p.nama_model;
      selModel.appendChild(opt);
    });

    syncPosModelSelect();
  };
}

function syncPosModelSelect() {
  const modelName = document.getElementById('pos_pilih_model')?.value;
  const selVarian = document.getElementById('pos_pilih_varian');
  if(!selVarian) return;

  selVarian.innerHTML = '';
  const prod = posProdukSource.find(p => p.nama_model === modelName);

  if(!prod || !prod.matriks_varian) {
    syncPosVarianHarga();
    return;
  }

  prod.matriks_varian.forEach((v, index) => {
    const opt = document.createElement('option');
    opt.value = index; // simpan index array penunjuk sub-varian
    opt.innerText = `Warna: ${v.warna} | Size: ${v.size} (Stok: ${v.stok})`;
    selVarian.appendChild(opt);
  });

  syncPosVarianHarga();
}

function syncPosVarianHarga() {
  const modelName = document.getElementById('pos_pilih_model')?.value;
  const idxVarian = document.getElementById('pos_pilih_varian')?.value;
  const preview = document.getElementById('pos-harga-jual-preview');

  let hargaJualDasar = 0;
  const prod = posProdukSource.find(p => p.nama_model === modelName);

  if(prod && idxVarian !== "" && prod?.matriks_varian?.[idxVarian]) {
    hargaJualDasar = prod.matriks_varian[idxVarian].jual_varian || 0;
  }

  if(preview) preview.innerText = formatRupiahCur(hargaJualDasar);
}

// ARSITEKTUR MULTI-ITEM KASIR KOKOH TAHAN BENTURAN BUG TYPEERROR
function addItemToCart() {
  const modelName = document.getElementById('pos_pilih_model')?.value;
  const idxVarian = document.getElementById('pos_pilih_varian')?.value;
  const qty = parseInt(document.getElementById('pos_qty')?.value) || 1;

  if(!modelName || idxVarian === "") {
    alert('Pilih item model pakaian dan sub-varian ukuran terlebih dahulu.');
    return;
  }

  const prod = posProdukSource.find(p => p.nama_model === modelName);
  const subVarian = prod?.matriks_varian?.[idxVarian];

  if(!subVarian) {
    alert('Sub-varian produk bermasalah.');
    return;
  }

  if(subVarian.stok < qty) {
    alert(`Stok tidak mencukupi. Batas stok tersedia saat ini: ${subVarian.stok}`);
    return;
  }

  // Cek apakah item dengan model, warna, dan ukuran yang sama sudah ada di dalam keranjang belanja
  const existingCartIndex = tempCartDataArray.findIndex(item => 
    item.nama_model === modelName && 
    item.warna === subVarian.warna && 
    item.size === subVarian.size
  );

  if (existingCartIndex > -1) {
    // Validasi akumulasi stok jika ditambahkan ke item yang sudah ada
    const totalNewQty = tempCartDataArray[existingCartIndex].qty + qty;
    if (subVarian.stok < totalNewQty) {
      alert(`Akumulasi jumlah di keranjang melebihi batas stok tersedia (${subVarian.stok}).`);
      return;
    }
    tempCartDataArray[existingCartIndex].qty = totalNewQty;
  } else {
    // Masukkan entitas belanja baru ke dalam array penampung multi-item
    tempCartDataArray.push({
      nama_model: modelName,
      warna: subVarian.warna,
      size: subVarian.size,
      qty: qty,
      harga_satuan: subVarian.jual_varian || 0,
      max_stok: subVarian.stok,
      original_prod_id: prod.id,
      variant_index_ref: parseInt(idxVarian)
    });
  }

  rebuildCartTableUI();
}

function rebuildCartTableUI() {
  const tbody = document.getElementById('tbody-cart');
  if(!tbody) return;

  tbody.innerHTML = '';
  if(tempCartDataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-xs text-gray-400">Keranjang masih kosong.</td></tr>`;
    calculateFinalPosPayment();
    return;
  }

  tempCartDataArray.forEach((item, index) => {
    const subtotal = item.qty * item.harga_satuan;
    const tr = document.createElement('tr');
    tr.className = "border-b border-gray-100 align-middle";
    tr.innerHTML = `
      <td class="p-4 font-bold text-[#0F172A]">
        ${item.nama_model}
        <span class="block text-[10px] text-gray-400 font-medium font-mono uppercase">Varian: ${item.warna} - Size: ${item.size}</span>
      </td>
      <td class="p-4 text-center">
        <input type="number" min="1" max="${item.max_stok}" onchange="updateCartQty(${index}, this.value)" class="w-14 text-center border border-gray-200 rounded p-1 font-bold" value="${item.qty}">
      </td>
      <td class="p-4">
        <input type="number" oninput="updateCartHargaSatuan(${index}, this.value)" class="w-24 border border-gray-200 rounded p-1 font-bold text-xs" value="${item.harga_satuan}">
      </td>
      <td class="p-4 font-bold text-gray-700">${formatRupiahCur(subtotal)}</td>
      <td class="p-4 text-center">
        <button onclick="removeCartItem(${index})" class="text-xs font-bold text-red-600 hover:underline">Batal</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  calculateFinalPosPayment();
}

function updateCartQty(index, val) {
  const qtyNum = parseInt(val) || 1;
  if(qtyNum > tempCartDataArray[index].max_stok) {
    alert(`Batas maksimum kuantitas stok: ${tempCartDataArray[index].max_stok}`);
    tempCartDataArray[index].qty = tempCartDataArray[index].max_stok;
  } else {
    tempCartDataArray[index].qty = qtyNum;
  }
  rebuildCartTableUI();
}

function updateCartHargaSatuan(index, val) {
  tempCartDataArray[index].harga_satuan = parseInt(val) || 0;
  // Langsung hitung live summary kotor tanpa render ulang total teks input untuk menjaga kenyamanan ketik
  calculateFinalPosPayment();
}

function removeCartItem(index) {
  tempCartDataArray.splice(index, 1);
  rebuildCartTableUI();
}

function calculateFinalPosPayment() {
  let subtotalKotor = 0;
  tempCartDataArray.forEach(item => {
    subtotalKotor += (item.qty * item.harga_satuan);
  });

  const diskonVal = parseInt(document.getElementById('pos_diskon')?.value) || 0;
  const tipeDiskon = document.getElementById('pos_tipe_diskon')?.value;
  const nominalDp = parseInt(document.getElementById('pos_dp')?.value) || 0;

  let totalPotonganDiskon = 0;
  if(tipeDiskon === 'rp') {
    totalPotonganDiskon = diskonVal;
  } else {
    totalPotonganDiskon = subtotalKotor * (diskonVal / 100);
  }

  const finalWajibBayar = Math.max(0, subtotalKotor - totalPotonganDiskon - nominalDp);

  // Suntik ke UI Summary Elemen Kasir
  if(document.getElementById('pos-summary-subtotal')) document.getElementById('pos-summary-subtotal').innerText = formatRupiahCur(subtotalKotor);
  if(document.getElementById('pos-summary-diskon')) document.getElementById('pos-summary-diskon').innerText = '- ' + formatRupiahCur(totalPotonganDiskon);
  if(document.getElementById('pos-summary-dp')) document.getElementById('pos-summary-dp').innerText = '- ' + formatRupiahCur(nominalDp);
  if(document.getElementById('pos-summary-final')) document.getElementById('pos-summary-final').innerText = formatRupiahCur(finalWajibBayar);

  return { subtotalKotor, totalPotonganDiskon, nominalDp, finalWajibBayar };
}

// FINAL CHECKOUT TRANSAKSI POS KASIR MASUK INDEXEDDB + INTEGRASI JURNAL AKUNTANSI REAL-TIME
function checkoutPosHandler() {
  if(tempCartDataArray.length === 0) {
    alert('Keranjang belanja kosong. Masukkan item terlebih dahulu.');
    return;
  }

  const namaCust = document.getElementById('pos_customer_nama')?.value?.trim();
  const hpCust = document.getElementById('pos_customer_hp')?.value?.trim();

  if(!namaCust || !hpCust) {
    alert('Data nama pelanggan dan nomor HP wajib dilengkapi untuk validasi nota CRM.');
    return;
  }

  const calc = calculateFinalPosPayment();
  const fBulan = document.getElementById('global-bulan').value;
  const fTahun = document.getElementById('global-tahun').value;
  const timestampNow = new Date().toISOString().split('T')[0];

  const transactionPayload = {
    tanggal: timestampNow,
    customer_nama: namaCust,
    customer_hp: hpCust,
    items: JSON.parse(JSON.stringify(tempCartDataArray)), // Deep clone data keranjang belanja
    summary: calc,
    ekspedisi: document.getElementById('pos_ekspedisi').value || '-',
    resi: document.getElementById('pos_resi').value || '-',
    status_nota: document.getElementById('pos_status_nota').value,
    bulan: fBulan,
    tahun: fTahun
  };

  // 1. Potong Stok Fisik di Store Produk & Update Data Customer CRM
  const tx = db.transaction(['store_produk', 'store_transaksi', 'store_customer', 'store_jurnal_akuntansi'], 'readwrite');
  
  // A. Eksekusi Pengurangan Kuota Stok Produk
  const prodStore = tx.objectStore('store_produk');
  transactionPayload.items.forEach(item => {
    prodStore.get(item.original_prod_id).onsuccess = (e) => {
      const prodData = e.target.result;
      if(prodData && prodData.matriks_varian?.[item.variant_index_ref]) {
        prodData.matriks_varian[item.variant_index_ref].stok -= item.qty; // kurangi stok
        prodStore.put(prodData);
      }
    };
  });

  // B. Simpan Log Transaksi POS Kasir
  tx.objectStore('store_transaksi').add(transactionPayload);

  // C. Update/Insert Database CRM Customer Secara Otomatis
  const custStore = tx.objectStore('store_customer');
  custStore.getAll().onsuccess = (e) => {
    const listCust = e.target.result || [];
    const exist = listCust.find(c => c.nomor_hp === hpCust);
    if(exist) {
      exist.total_transaksi += (calc.subtotalKotor - calc.totalPotonganDiskon); // Akumulasi belanja kotor pasca diskon
      custStore.put(exist);
    } else {
      custStore.add({
        nama_customer: namaCust,
        nomor_hp: hpCust,
        total_transaksi: (calc.subtotalKotor - calc.totalPotonganDiskon),
        timestamp: timestampNow
      });
    }
  };

  // D. LIVE REAL-TIME SYNC INTEGRATION: Masuk Otomatis ke Buku Jurnal Akuntansi Keuangan
  const nominalDiterimaUangMasuk = calc.nominalDp > 0 ? calc.nominalDp : calc.finalWajibBayar;
  tx.objectStore('store_jurnal_akuntansi').add({
    tanggal: timestampNow,
    keterangan: `Penjualan POS Multi-Item atas nama pelanggan: ${namaCust}`,
    jenis: 'Masuk',
    nominal: nominalDiterimaUangMasuk,
    is_piutang: transactionPayload.status_nota === 'Piutang' ? 'Ya' : 'Tidak',
    piutang_amount: transactionPayload.status_nota === 'Piutang' ? calc.finalWajibBayar : 0,
    bulan: fBulan,
    tahun: fTahun
  });

  tx.oncomplete = () => {
    alert('Transaksi POS Kasir Berhasil Dicatat Permanen ke Database & Sinkron Real-time Keuangan.');
    
    // Pemicu Unduh Dokumen Struk PDF Otomatis via jsPDF
    generateThermalPDFReceipt(transactionPayload);

    // Siapkan Tombol Teks Kirim via API WhatsApp
    prepareWhatsAppShareButton(transactionPayload);

    // Bersihkan form kasir
    tempCartDataArray = [];
    document.getElementById('form-pos-cust-reset-anchor')?.click(); // trigger reset formal
    document.getElementById('pos_customer_nama').value = '';
    document.getElementById('pos_customer_hp').value = '';
    document.getElementById('pos_diskon').value = '0';
    document.getElementById('pos_dp').value = '0';
    document.getElementById('pos_ekspedisi').value = '';
    document.getElementById('pos_resi').value = '';

    rebuildCartTableUI();
    renderAllDataModules();
  };
}

function prepareWhatsAppShareButton(trx) {
  const container = document.getElementById('wa-share-area');
  if(!container) return;

  container.classList.remove('hidden');
  
  // Format rincian daftar belanjaan multi-item untuk dikirim ke customer via WhatsApp
  let textNota = `*NOTA RESMI CLOTHVERS SYSTEM*\n`;
  textNota += `Pelanggan: ${trx.customer_nama}\n`;
  textNota += `Tanggal: ${trx.tanggal}\n`;
  textNota += `----------------------------------------\n`;
  
  trx.items.forEach(item => {
    textNota += `- ${item.nama_model} (${item.warna} - ${item.size}) x${item.qty} : ${formatRupiahCur(item.qty * item.harga_satuan)}\n`;
  });
  
  textNota += `----------------------------------------\n`;
  textNota += `Subtotal Kotor: ${formatRupiahCur(trx.summary.subtotalKotor)}\n`;
  textNota += `Potongan Diskon: ${formatRupiahCur(trx.summary.totalPotonganDiskon)}\n`;
  textNota += `Uang Muka/DP: ${formatRupiahCur(trx.summary.nominalDp)}\n`;
  textNota += `*TOTAL WAJIB BAYAR: ${formatRupiahCur(trx.summary.finalWajibBayar)}* [Status: ${trx.status_nota}]\n\n`;
  textNota += `Terima kasih telah berbelanja di Clothvers x Elevatio.`;

  const encodedText = encodeURIComponent(textNota);
  // Bersihkan karakter awalan angka telepon indo agar pas dengan API wa.me
  let cleanPhone = trx.customer_hp.replace(/[^0-9]/g, '');
  if(cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  const targetWaUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  container.innerHTML = `
    <a href="${targetWaUrl}" target="_blank" class="w-full bg-emerald-600 text-white font-bold text-center block text-xs py-2.5 rounded-xl hover:bg-emerald-700 transition">
      💬 Kirim Struk via WhatsApp Sekarang
    </a>
  `;
}

// LOGIKA CETAK STRUK THERMAL PDF MENGGUNAKAN JSPDF INTERNAL
function generateThermalPDFReceipt(trx) {
  const { jsPDF } = window.jspdf;
  // Buat dimensi layout memanjang berformat struk kasir toko roll 80mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150 + (trx.items.length * 10)]
  });

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CLOTHVERS SYSTEM", 40, 10, { align: "center" });
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.text("ERP Single-Page v1.0 - Luring Mandiri", 40, 14, { align: "center" });
  doc.text(`Tanggal Nota: ${trx.tanggal}`, 5, 20);
  doc.text(`Pelanggan   : ${trx.customer_nama} (${trx.customer_hp})`, 5, 24);
  doc.text(`Status/Resi : ${trx.status_nota} / ${trx.resi}`, 5, 28);
  doc.text("----------------------------------------------------------------------", 5, 32);

  let startY = 36;
  doc.setFont("Helvetica", "bold");
  doc.text("Item Deskripsi Varian", 5, startY);
  doc.text("Qty", 50, startY);
  doc.text("Subtotal", 62, startY);
  doc.setFont("Helvetica", "normal");

  trx.items.forEach(item => {
    startY += 6;
    doc.text(`${item.nama_model} (${item.warna}-${item.size})`, 5, startY, { maxWidth: 42 });
    doc.text(`${item.qty}`, 52, startY);
    doc.text(`${(item.qty * item.harga_satuan).toLocaleString('id-ID')}`, 62, startY);
  });

  startY += 10;
  doc.text("----------------------------------------------------------------------", 5, startY);
  startY += 5;
  doc.text(`Subtotal Kotor : Rp ${trx.summary.subtotalKotor.toLocaleString('id-ID')}`, 5, startY);
  startY += 4;
  doc.text(`Diskon Potong  : Rp ${trx.summary.totalPotonganDiskon.toLocaleString('id-ID')}`, 5, startY);
  startY += 4;
  doc.text(`Uang Muka (DP) : Rp ${trx.summary.nominalDp.toLocaleString('id-ID')}`, 5, startY);
  startY += 5;
  doc.setFont("Helvetica", "bold");
  doc.text(`TOTAL BAYAR    : Rp ${trx.summary.finalWajibBayar.toLocaleString('id-ID')}`, 5, startY);

  startY += 10;
  doc.setFont("Helvetica", "italic");
  doc.text("Made in by Clothvers x Elevatio", 40, startY, { align: "center" });

  doc.save(`Struk_Clothvers_${Date.now()}.pdf`);
}

// =======================================================
// 👥 LOGIKA DASHBOARD D: DATABASE CUSTOMER (CRM LOG)
// =======================================================
function renderCustomerModul() {
  const tbody = document.getElementById('tbody-customer');
  if(!tbody) return;

  const tx = db.transaction('store_customer', 'readonly');
  const store = tx.objectStore('store_customer');
  const req = store.getAll();

  req.onsuccess = () => {
    const list = req.result || [];
    tbody.innerHTML = '';

    if(list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-xs text-gray-400">Belum ada basis pelanggan terekam.</td></tr>`;
      return;
    }

    list.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-50 border-b border-gray-100 align-middle";
      tr.innerHTML = `
        <td class="p-4 text-xs font-mono">${c?.timestamp || '-'}</td>
        <td class="p-4 font-bold text-[#0F172A]">${c?.nama_customer || '-'}</td>
        <td class="p-4 text-xs font-semibold text-gray-500">${c?.nomor_hp || '-'}</td>
        <td class="p-4 font-bold text-emerald-800">${formatRupiahCur(c?.total_transaksi)}</td>
        <td class="p-4 text-center">
          <button onclick="deleteDataGeneric('store_customer', ${c.id})" class="text-xs font-bold text-red-600 hover:underline">Hapus Log</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };
}

// =======================================================
// 🔄 LOGIKA MODUL E: RETUR, REJECT & DASHBOARD INVENTARIS
// =======================================================
function saveReturHandler(e) {
  e.preventDefault();
  if(!db) return;

  const payload = {
    model: document.getElementById('retur_model').value,
    jenis: document.getElementById('retur_jenis').value,
    biaya: parseInt(document.getElementById('retur_biaya').value) || 0,
    bulan: document.getElementById('global-bulan').value,
    tahun: document.getElementById('global-tahun').value,
    tanggal: new Date().toISOString().split('T')[0]
  };

  const tx = db.transaction(['store_retur_reject', 'store_jurnal_akuntansi'], 'readwrite');
  tx.objectStore('store_retur_reject').add(payload);

  // INTEGRASI AKUNTANSI OTOMATIS: Kerugian retur/reject masuk kategori pengeluaran jurnal
  tx.objectStore('store_jurnal_akuntansi').add({
    tanggal: payload.tanggal,
    keterangan: `Pengeluaran Retur/Reject [${payload.jenis}]: ${payload.model}`,
    jenis: 'Keluar',
    nominal: payload.biaya,
    bulan: payload.bulan,
    tahun: payload.tahun
  });

  tx.oncomplete = () => {
    alert('Log Kasus Retur Berhasil Disimpan & Sinkron Otomatis Ke Jurnal Keuangan.');
    document.getElementById('form-retur').reset();
    renderAllDataModules();
  };
}

function saveInventarisHandler(e) {
  e.preventDefault();
  if(!db) return;

  const payload = {
    nama_aset: document.getElementById('inv_nama').value,
    harga_awal: parseInt(document.getElementById('inv_harga').value) || 0,
    masa_manfaat_bulan: parseInt(document.getElementById('inv_masa').value) || 1,
    bulan: document.getElementById('global-bulan').value,
    tahun: document.getElementById('global-tahun').value,
    tanggal: new Date().toISOString().split('T')[0]
  };

  const tx = db.transaction(['store_inventaris', 'store_jurnal_akuntansi'], 'readwrite');
  tx.objectStore('store_inventaris').add(payload);

  // Hitung Nilai Depresiasi Penyusutan Bulanan = Harga Awal / Masa Manfaat
  const bebanPenyusutanBulanIni = Math.round(payload.harga_awal / payload.masa_manfaat_bulan);

  // Otomatis masukkan beban penyusutan alat ke kas keluar akuntansi
  tx.objectStore('store_jurnal_akuntansi').add({
    tanggal: payload.tanggal,
    keterangan: `Beban Penyusutan Bulanan Aset: ${payload.nama_aset}`,
    jenis: 'Keluar',
    nominal: bebanPenyusutanBulanIni,
    bulan: payload.bulan,
    tahun: payload.tahun
  });

  tx.oncomplete = () => {
    alert('Aset Inventaris Ditambahkan & Amortisasi Penyusutan Berhasil Terdistribusi Ke Keuangan.');
    document.getElementById('form-inventaris').reset();
    renderAllDataModules();
  };
}

function renderReturInventarisModul() {
  const tRetur = document.getElementById('tbody-retur');
  const tInv = document.getElementById('tbody-inventaris');
  
  const fBulan = document.getElementById('global-bulan')?.value;
  const fTahun = document.getElementById('global-tahun')?.value;

  if(tRetur) {
    const tx = db.transaction('store_retur_reject', 'readonly');
    tx.objectStore('store_retur_reject').getAll().onsuccess = (e) => {
      const list = e.target.result || [];
      const fil = list.filter(i => i.bulan === fBulan && i.tahun === fTahun);
      tRetur.innerHTML = '';
      fil.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = "border-b text-xs border-gray-100";
        tr.innerHTML = `
          <td class="p-3 font-bold">${r.model}</td>
          <td class="p-3"><span class="bg-amber-100 text-amber-900 rounded p-1 font-semibold">${r.jenis}</span></td>
          <td class="p-3 font-semibold text-red-600">${formatRupiahCur(r.biaya)}</td>
          <td class="p-3 text-center"><button onclick="deleteDataGeneric('store_retur_reject', ${r.id})" class="text-red-600 font-bold hover:underline">Hapus</button></td>
        `;
        tRetur.appendChild(tr);
      });
    };
  }

  if(tInv) {
    const tx = db.transaction('store_inventaris', 'readonly');
    tx.objectStore('store_inventaris').getAll().onsuccess = (e) => {
      const list = e.target.result || [];
      const fil = list.filter(i => i.bulan === fBulan && i.tahun === fTahun);
      tInv.innerHTML = '';
      fil.forEach(i => {
        const beban = Math.round(i.harga_awal / i.masa_manfaat_bulan);
        const tr = document.createElement('tr');
        tr.className = "border-b text-xs border-gray-100";
        tr.innerHTML = `
          <td class="p-3 font-bold">${i.nama_aset}</td>
          <td class="p-3">${formatRupiahCur(i.harga_awal)}</td>
          <td class="p-3 font-semibold text-red-500">${formatRupiahCur(beban)}</td>
          <td class="p-3 text-center"><button onclick="deleteDataGeneric('store_inventaris', ${i.id})" class="text-red-600 font-bold hover:underline">Hapus</button></td>
        `;
        tInv.appendChild(tr);
      });
    };
  }
}

// =======================================================
// 💵 LOGIKA MODUL F: AKUNTANSI & KEUANGAN (INTEGRASI REAL-TIME)
// =======================================================
function renderAkuntansiModul() {
  const tbody = document.getElementById('tbody-akuntansi');
  if(!tbody) return;

  const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
  const store = tx.objectStore('store_jurnal_akuntansi');
  const req = store.getAll();

  req.onsuccess = () => {
    const list = req.result || [];
    
    const fBulan = document.getElementById('global-bulan')?.value;
    const fTahun = document.getElementById('global-tahun')?.value;
    const fFilterWaktu = document.getElementById('filter-akuntansi-waktu')?.value || 'Semua';

    const timestampHariIni = new Date().toISOString().split('T')[0];

    // Filter Aturan Kronologis Buku Besar Real-time
    let filteredList = list;

    if (fFilterWaktu === 'Hari') {
      filteredList = list.filter(item => item.tanggal === timestampHariIni);
    } else if (fFilterWaktu === 'Bulan') {
      filteredList = list.filter(item => item.bulan === fBulan && item.tahun === fTahun);
    } else if (fFilterWaktu === 'Tahun') {
      filteredList = list.filter(item => item.tahun === fTahun);
    } else if (fFilterWaktu === 'Minggu') {
      // Filter sederhana rentang 7 hari ke belakang
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - 7);
      filteredList = list.filter(item => new Date(item.tanggal) >= dateLimit);
    }

    // Urutkan berdasarkan tanggal terbaru kronologis
    filteredList.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));

    let sumOmsetMasuk = 0;
    let sumPiutangDp = 0;
    let sumPengeluaranBeban = 0;

    tbody.innerHTML = '';
    filteredList.forEach(j => {
      if(j.jenis === 'Masuk') {
        sumOmsetMasuk += j.nominal;
        if(j.is_piutang === 'Ya') {
          sumPiutangDp += (j.piutang_amount || 0);
        }
      } else if(j.jenis === 'Keluar') {
        sumPengeluaranBeban += j.nominal;
      }

      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-50 border-b border-gray-100 align-middle";
      
      const badgeWarna = j.jenis === 'Masuk' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900';
      
      tr.innerHTML = `
        <td class="p-4 text-xs font-mono">${j.tanggal || '-'}</td>
        <td class="p-4 font-semibold text-[#0F172A]">${j.keterangan || '-'}</td>
        <td class="p-4"><span class="${badgeWarna} font-bold rounded-md px-2 py-0.5 text-[11px]">${j.jenis}</span></td>
        <td class="p-4 font-bold ${j.jenis === 'Masuk' ? 'text-emerald-700' : 'text-red-600'}">${formatRupiahCur(j.nominal)}</td>
        <td class="p-4 text-center">
          <button onclick="deleteDataGeneric('store_jurnal_akuntansi', ${j.id})" class="text-xs font-bold text-red-600 hover:underline">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Pasang hasil akumulasi matematika ke Papan Rekap Keuangan Utama
    const labaBersihTotal = sumOmsetMasuk - sumPengeluaranBeban;
    
    if(document.getElementById('gl-omset')) document.getElementById('gl-omset').innerText = formatRupiahCur(sumOmsetMasuk);
    if(document.getElementById('gl-piutang')) document.getElementById('gl-piutang').innerText = formatRupiahCur(sumPiutangDp);
    if(document.getElementById('gl-pengeluaran')) document.getElementById('gl-pengeluaran').innerText = formatRupiahCur(sumPengeluaranBeban);
    if(document.getElementById('gl-bersih')) document.getElementById('gl-bersih').innerText = formatRupiahCur(labaBersihTotal);
  };
}

// =======================================================
// 💾 DATABASE SYNC BRIDGE & BACKUP PANEL (JSON IMPOR/EKSPOR)
// =======================================================
function exportDatabaseToJSONFile() {
  if(!db) return;
  const storeNames = ['store_produk', 'store_hpp', 'store_transaksi', 'store_jurnal_akuntansi', 'store_retur_reject', 'store_inventaris', 'store_customer'];
  const backupObjectCluster = {};
  
  const tx = db.transaction(storeNames, 'readonly');
  let counterLoaded = 0;

  storeNames.forEach(name => {
    tx.objectStore(name).getAll().onsuccess = (e) => {
      backupObjectCluster[name] = e.target.result || [];
      counterLoaded++;
      
      if(counterLoaded === storeNames.length) {
        // Semua data terkumpul, unduh dalam format JSON fisik luring
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObjectCluster));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `Backup_ClothversDB_ERP_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
      }
    };
  });
}

function importDatabaseFromJSONFile(e) {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const clusterObj = JSON.parse(evt.target.result);
      if(!clusterObj || typeof clusterObj !== 'object') {
        alert('Struktur berkas JSON rusak atau tidak valid.');
        return;
      }

      if(!confirm('Perhatian! Mengunggah database baru akan menimpa seluruh data lama di browser ini. Lanjutkan?')) return;

      const storeNames = Object.keys(clusterObj);
      const tx = db.transaction(storeNames, 'readwrite');

      storeNames.forEach(name => {
        const store = tx.objectStore(name);
        store.clear(); // Bersihkan isi lama
        clusterObj[name].forEach(item => {
          // Hapus key id autoIncrement agar tidak memicu duplikasi konflik indeks primer IndexedDB
          if(item.id) delete item.id;
          store.add(item);
        });
      });

      tx.oncomplete = () => {
        alert('Restorasi Database Sukses. Halaman akan dimuat ulang otomatis.');
        window.location.reload();
      };
    } catch(err) {
      alert('Gagal memproses file JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// UTULITAS GLOBAL UNTUK MENGHAPUS DATA SECARA GENERIK
function deleteDataGeneric(storeName, id) {
  if(!confirm('Apakah Anda yakin ingin menghapus data log ini secara permanen dari database lokal?')) return;
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  tx.oncomplete = () => {
    renderAllDataModules();
  };
}

// =======================================================
// 🛑 LOGIKA INTEGRASI EKSPOR DOKUMEN PDF KOLEKTIF & CSV EXCEL
// =======================================================

// 1. DOWNLOAD PDF MASTER STOK
function downloadPDFMasterStok() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont("Helvetica", "bold");
  doc.text("LAPORAN DATA KORPORASI MASTER STOK PAKAIAN", 14, 15);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  const tx = db.transaction('store_produk', 'readonly');
  tx.objectStore('store_produk').getAll().onsuccess = (e) => {
    const arr = e.target.result || [];
    const tableBodyRows = [];
    
    arr.forEach(p => {
      p?.matriks_varian?.forEach(v => {
        tableBodyRows.push([
          p.nama_model || '-',
          p.jenis_kain || '-',
          v.warna || '-',
          v.size || '-',
          v.stok || '0',
          formatRupiahCur(v.hpp_varian),
          formatRupiahCur(v.jual_varian)
        ]);
      });
    });

    doc.autoTable({
      startY: 28,
      head: [['Model Pakaian', 'Jenis Kain', 'Warna', 'Size', 'Stok', 'HPP Kain', 'Harga Jual']],
      body: tableBodyRows,
      theme: 'grid'
    });
    doc.save('Laporan_Master_Stok_Clothvers.pdf');
  };
}

// 2. DOWNLOAD PDF SEMUA LAPORAN HPP
function downloadPDFAllHpp() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("LAPORAN SIMULASI HARGA & STRUKTUR HPP COMPREHENSIVE", 14, 15);

  const tx = db.transaction('store_hpp', 'readonly');
  tx.objectStore('store_hpp').getAll().onsuccess = (e) => {
    const list = e.target.result || [];
    const rows = list.map(h => [
      `${h.nama_model} (${h.size_terpilih})`,
      formatRupiahCur(h.biaya_kain_otomatis),
      formatRupiahCur(h.ongkos_jahit),
      formatRupiahCur(h.hpp_total),
      formatRupiahCur(h.harga_jual_channels?.wa),
      formatRupiahCur(h.harga_jual_channels?.shopee),
      formatRupiahCur(h.harga_jual_channels?.tiktok)
    ]);

    doc.autoTable({
      startY: 25,
      head: [['Model & Ukuran', 'Biaya Kain', 'Jahit', 'HPP Total', 'WA Retail', 'Shopee Price', 'TikTok Price']],
      body: rows,
      theme: 'striped'
    });
    doc.save('Laporan_HPP_Global_Clothvers.pdf');
  };
}

// 3. DOWNLOAD PDF DATABASE CUSTOMER
function downloadPDFDatabaseCustomer() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("LAPORAN CRM DATABASE LOYALITAS PELANGGAN", 14, 15);

  const tx = db.transaction('store_customer', 'readonly');
  tx.objectStore('store_customer').getAll().onsuccess = (e) => {
    const list = e.target.result || [];
    const rows = list.map(c => [c.timestamp, c.nama_customer, c.nomor_hp, formatRupiahCur(c.total_transaksi)]);

    doc.autoTable({
      startY: 25,
      head: [['Tanggal Gabung', 'Nama Pelanggan', 'No WhatsApp', 'Total Kontribusi']],
      body: rows
    });
    doc.save('Database_Customer_CRM_Clothvers.pdf');
  };
}

// 4. DOWNLOAD PDF AKUNTANSI BUKU BESAR
function downloadPDFAkuntansi() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("BUKU BESAR LEDGER KRONOLOGIS TRANSAKSI KEUANGAN", 14, 15);

  const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
  tx.objectStore('store_jurnal_akuntansi').getAll().onsuccess = (e) => {
    const list = e.target.result || [];
    const rows = list.map(j => [j.tanggal, j.keterangan, j.jenis, formatRupiahCur(j.nominal)]);

    doc.autoTable({
      startY: 25,
      head: [['Tanggal Ledger', 'Keterangan Sumber', 'Aliran', 'Nominal']],
      body: rows
    });
    doc.save('Buku_Besar_Akuntansi_Clothvers.pdf');
  };
}

// 5. EKSPOR DATA CSV EXCEL BUKU JURNAL AKUNTANSI
function exportCSVDataAkuntansi() {
  const tx = db.transaction('store_jurnal_akuntansi', 'readonly');
  tx.objectStore('store_jurnal_akuntansi').getAll().onsuccess = (e) => {
    const list = e.target.result || [];
    if(list.length === 0) {
      alert('Tidak ada records untuk diekspor ke Excel.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Keterangan,Aliran,Nominal\n";
    
    list.forEach(j => {
      const cleanKet = j.keterangan ? j.keterangan.replace(/,/g, ' ') : '';
      csvContent += `${j.tanggal || ''},${cleanKet},${j.jenis || ''},${j.nominal || 0}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", `Jurnal_Akuntansi_Clothvers_${Date.now()}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  };
}
