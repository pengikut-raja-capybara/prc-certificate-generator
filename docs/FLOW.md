# 📐 Arsitektur & Alur Kerja Sistem (Flow Charts)

Dokumen ini memuat arsitektur teknis, diagram alur (*flowcharts*), diagram sekuensial (*sequence diagrams*), dan alur kriptografis pada aplikasi **PRC Certificate Generator & PAdES Multi-Signer** menggunakan visualisasi standar **Mermaid**.

---

## 📑 Daftar Isi
1. [Alur Kerja Pengguna (End-to-End User Journey)](#1-alur-kerja-pengguna-end-to-end-user-journey)
2. [Arsitektur Data & Komponen (System Architecture)](#2-arsitektur-data--komponen-system-architecture)
3. [Alur Pipeline Multi-Signer & Lazy Stamping](#3-alur-pipeline-multi-signer--lazy-stamping)
4. [Proses Kriptografi Manifes Dokumen (LIGHTSIGN-v1)](#4-proses-kriptografi-manifes-dokumen-lightsign-v1)
5. [Alur Pembacaan & Sanitasi Spreadsheet (ExcelJS Engine)](#5-alur-pembacaan--sanitasi-spreadsheet-exceljs-engine)
6. [Alur Verifikasi Dokumen Digital (Verification Flow)](#6-alur-verifikasi-dokumen-digital-verification-flow)

---

## 1. Alur Kerja Pengguna (End-to-End User Journey)

Alur kerja aplikasi dirancang dalam **5 Tahap Terpadu (Guided Stepper Workflow)** untuk memandu pengguna dari perancangan visual hingga pengunduhan sertifikat akhir.

```mermaid
flowchart TD
    Start(["Mulai Aplikasi"]) --> Step1["Langkah 1: Setup Template"]
    
    subgraph S1["Langkah 1: WYSIWYG Template Designer"]
        Step1 --> S1_Canvas["Kanvas Interaktif Fabric.js"]
        S1_Canvas --> S1_Bg["Upload Gambar Latar / Background"]
        S1_Canvas --> S1_Text["Tambah Teks Statis & Variabel Dinamis (nama, nomor, dll.)"]
        S1_Canvas --> S1_Stamp["Tentukan Posisi Slot Stempel TTD & Style A/B/C"]
        S1_Stamp --> S1_Save["Simpan Template ke JSON / LocalStorage"]
    end
    
    S1_Save --> Step2["Langkah 2: Input Data & Signer"]
    
    subgraph S2["Langkah 2: Pengolahan Data & Penentuan Pejabat"]
        Step2 --> S2_Format["Unduh Template Format Excel Otomatis"]
        S2_Format --> S2_Upload["Unggah File Data .xlsx atau .csv"]
        S2_Upload --> S2_Parse["Parser Cerdas ExcelJS: Trimming & Format Tanggal"]
        S2_Parse --> S2_Map["Petakan Pejabat Penandatangan ke Slot Stempel"]
        S2_Map --> S2_Table["Tinjau / Edit Data Penerima di Tabel"]
    end
    
    S2_Table --> Step3["Langkah 3: Generate Base PDF"]
    
    subgraph S3["Langkah 3: Kompilasi Dokumen PDF Dasar"]
        Step3 --> S3_Loop["Iterasi Tiap Baris Data Penerima"]
        S3_Loop --> S3_Replace["Substitusi Variabel Dinamis (nama, no_sertifikat, dll.)"]
        S3_Replace --> S3_Compile["Render PDF Vektor Resolusi Tinggi via PDF-Lib"]
        S3_Compile --> S3_Hash["Hitung SHA-256 Digest Dokumen Dasar (h_D)"]
        S3_Hash --> S3_Preview["Pratinjau PDF Dasar di Modal Web"]
    end
    
    S3_Preview --> Step4["Langkah 4: Multi-Signer PAdES Signing"]
    
    subgraph S4["Langkah 4: Penandatanganan Kriptografis Bertingkat"]
        Step4 --> S4_KeyCheck["Periksa Kunci X.509 / PKCS#12 di Browser Keystore"]
        S4_KeyCheck --> S4_Sign1["Batch Sign Pejabat 1 (Contoh: Dekan)"]
        S4_Sign1 --> S4_Lazy1["Lazy Stamping: Tempel Stempel Visual 1 & Signature #1"]
        S4_Lazy1 --> S4_Sign2["Batch Sign Pejabat 2 (Contoh: Rektor)"]
        S4_Sign2 --> S4_Lazy2["Lazy Stamping: Tempel Stempel Visual 2 & Signature #2"]
        S4_Lazy2 --> S4_Complete["Validasi Seluruh Kuorum Tanda Tangan Selesai"]
    end
    
    S4_Complete --> Step5["Langkah 5: Download & Distribusi"]
    
    subgraph S5["Langkah 5: Pengemasan & Ekspor"]
        Step5 --> S5_Pack["Kemas Semua PDF Sah ke Arsip ZIP via JSZip"]
        S5_Pack --> S5_Manifest["Sertakan Berkas Manifes Kriptografis .sig.json"]
        S5_Manifest --> S5_Export["Unduh Berkas ZIP ke Perangkat Lokal"]
    end
    
    S5_Export --> Finish(["Selesai / Sertifikat Siap Didistribusikan"])
```

---

## 2. Arsitektur Data & Komponen (System Architecture)

Aplikasi dibangun berbasis arsitektur *clean state-driven* dengan **Zustand** sebagai pengelola status reaktif dan modular:

```mermaid
graph TB
    subgraph UI_Layer["Komponen Antarmuka (React 19)"]
        Shell["AppShell & Header Stepper"]
        CanvasView["Editor Canvas & Tools"]
        DataView["InputDataStep & Spreadsheet UI"]
        GenView["GenerateStep & PDF Viewer"]
        SignView["SigningStep & Progress Modal"]
        DownloadView["DownloadStep & ZIP Exporter"]
        KeyModal["KeyManagerView / Keystore Hub"]
    end

    subgraph State_Layer["Manajemen Status (Zustand Stores)"]
        EditorStore["editor-store<br/>- Canvas JSON<br/>- Elements, Variables<br/>- Stamp Slots<br/>- Active Zoom & History"]
        GenStore["generator-store<br/>- Recipient Data Rows<br/>- Signer Slot Mapping<br/>- Generated Base PDFs<br/>- Signed PDFs & Manifests"]
        KeysStore["keys-store<br/>- Local CA Certificate<br/>- Signer Keypairs<br/>- PKCS#12 Bundles"]
    end

    subgraph Core_Engine["Pustaka & Engine Klien"]
        Fabric["Fabric.js v7<br/>Visual WYSIWYG"]
        ExcelEngine["ExcelJS<br/>Spreadsheet Parser/Exporter"]
        PDFRenderer["PDF-Lib & @libpdf/core<br/>PDF Assembly Engine"]
        StampEngine["Stamp Renderer<br/>QR Code & Visual Typography"]
        CryptoEngine["Node-Forge & Web Crypto<br/>X.509, RSA-2048, SHA-256"]
        StorageEngine["LocalForage<br/>Browser IndexedDB Storage"]
        ZipEngine["JSZip<br/>Batch Archiving"]
    end

    CanvasView --> EditorStore
    EditorStore --> Fabric
    
    DataView --> GenStore
    GenStore --> ExcelEngine
    
    GenView --> PDFRenderer
    PDFRenderer --> CryptoEngine
    
    SignView --> StampEngine
    StampEngine --> PDFRenderer
    SignView --> CryptoEngine
    
    KeyModal --> KeysStore
    KeysStore --> CryptoEngine
    KeysStore --> StorageEngine
    
    DownloadView --> ZipEngine
```

---

## 3. Alur Pipeline Multi-Signer & Lazy Stamping

Salah satu keunggulan teknis utama adalah **Lazy Visual Stamping** dan **Incremental Multi-Signing PAdES**. Stempel tanda tangan tidak dicap saat pembuatan template, melainkan hanya muncul saat pejabat terkait mengeksekusi tanda tangan digitalnya. Urutan penandatanganan bersifat bebas (*order-independent*).

```mermaid
sequenceDiagram
    autonumber
    participant UI as Antarmuka Pengguna
    participant Pipe as Signing Pipeline
    participant Stamp as Stamp Renderer
    participant PDF as @libpdf/core Engine
    participant Crypto as Forge (PKI / X.509)
    participant Store as Generator Store

    Note over UI, Store: Tahap 0: Dokumen Dasar (Base PDF)
    UI->>Pipe: Request Penandatanganan untuk Pejabat A
    Pipe->>Crypto: Ambil Kunci Privat & Sertifikat X.509 Pejabat A
    Crypto-->>Pipe: Pasangan Kunci & Sertifikat Siap
    
    Note over Pipe, PDF: Tahap 1: Signer A Menandatangani
    Pipe->>Stamp: Generate Visual Stamp Pejabat A (QR + Teks Identitas)
    Stamp-->>Pipe: Rasterized Stamp PNG (300 DPI)
    Pipe->>PDF: Sisipkan Stamp Pejabat A pada Koordinat Slot A
    Pipe->>PDF: Buat Signature Dictionary PAdES (Incremental Revision 1)
    PDF->>Crypto: Hitung Hash ByteRange & Tanda Tangani dengan RSA-2048
    Crypto-->>PDF: Tanda Tangan Kriptografis (PKCS#7 / CMS)
    PDF-->>Pipe: Output PDF Revision 1 (Stamp A Aktif, Stamp B Kosong)
    Pipe->>Store: Simpan PDF Revisi 1
    
    Note over UI, Store: Tahap 2: Signer B Menandatangani
    UI->>Pipe: Request Penandatanganan untuk Pejabat B
    Pipe->>Crypto: Ambil Kunci Privat & Sertifikat X.509 Pejabat B
    Crypto-->>Pipe: Pasangan Kunci & Sertifikat Siap
    Pipe->>Stamp: Generate Visual Stamp Pejabat B (QR + Teks Identitas)
    Stamp-->>Pipe: Rasterized Stamp PNG (300 DPI)
    Pipe->>PDF: Sisipkan Stamp Pejabat B pada Koordinat Slot B
    Pipe->>PDF: Append Incremental Revision 2 (Tanpa Merusak Revision 1)
    PDF->>Crypto: Hitung Hash ByteRange Baru & Tanda Tangani
    Crypto-->>PDF: Tanda Tangan Kriptografis Pejabat B
    PDF-->>Pipe: Output PDF Final (Stamp A & Stamp B Keduanya Aktif)
    Pipe->>Store: Simpan PDF Final Sah
    Pipe-->>UI: Status Selesai (Semua Tanda Tangan Lengkap & Sah)
```

---

## 4. Proses Kriptografi Manifes Dokumen (`LIGHTSIGN-v1`)

> 🧮 **Rumus Matematis Lengkap**:
> Untuk penjabaran formal notasi matematika ($h_D$, $h_U$, $h_M$, $\sigma_i$, $N_{\text{valid}}$, kuorum $k$-of-$n$, dan model biner PAdES), silakan baca dokumen spesifikasi **[docs/SIGNING_FORMULA.md](SIGNING_FORMULA.md)**.

Diagram berikut menjelaskan bagaimana integritas dokumen, daftar pejabat berwenang, dan bukti persetujuan diikat menjadi satu manifes digital anti-manipulasi:

```mermaid
flowchart TD
    subgraph InputData["1. Data Masukan"]
        BaseDoc["Dokumen PDF Dasar (Bytes)"]
        SignerList["Daftar Otoritas (Nama, Role, Public Key)"]
        Timestamp["Waktu Penerbitan Dokumen (ISO UTC)"]
    end

    subgraph HashCalculation["2. Penghitungan Digest (SHA-256)"]
        BaseDoc -->|SHA-256| HashDoc["Digest Dokumen Asli (h_D)"]
        SignerList -->|Canonical Hash| HashSigners["Digest Otoritas Pejabat (h_U)"]
    end

    subgraph ManifestBuild["3. Pembentukan Payload Manifes (M)"]
        HashDoc --> ManifestPayload["Canonical Payload Persetujuan:<br/>LIGHTSIGN-v1 | h_D | h_U | Timestamp"]
        HashSigners --> ManifestPayload
        Timestamp --> ManifestPayload
        ManifestPayload -->|SHA-256| HashManifest["Digest Manifes (h_M)"]
    end

    subgraph DigitalSigning["4. Penandatanganan Kriptografi"]
        HashManifest --> SignA["Tanda Tangan Pejabat A<br/>sig_A = Sign(sk_A, h_M)"]
        HashManifest --> SignB["Tanda Tangan Pejabat B<br/>sig_B = Sign(sk_B, h_M)"]
        PrivKeyA["Private Key sk_A (RSA-2048)"] --> SignA
        PrivKeyB["Private Key sk_B (RSA-2048)"] --> SignB
    end

    subgraph OutputManifest["5. Berkas Manifes Akhir (.sig.json)"]
        SignA --> ManifestJSON["Berkas Manifes Integritas:<br/>- Versi Protokol<br/>- Nilai Hash Dokumen (h_D)<br/>- Hash Daftar Pejabat (h_U)<br/>- Token Bukti Persetujuan (sig_i)<br/>- Status Kuorum (k-of-n)"]
        SignB --> ManifestJSON
    end
```

---

## 5. Alur Pembacaan & Sanitasi Spreadsheet (ExcelJS Engine)

Modul **Spreadsheet IO** menggunakan pustaka `ExcelJS` dengan pembersihan otomatis untuk menjamin kebersihan data sebelum disubstitusikan ke template sertifikat:

```mermaid
flowchart TD
    FileIn[/"Berkas Spreadsheet .xlsx atau .csv"/] --> CheckType{"Format Berkas?"}
    
    CheckType -->|XLSX| LoadXlsx["Baca WorkBook via ExcelJS"]
    CheckType -->|CSV| LoadCsv["Baca Berkas CSV via ExcelJS Parser"]
    
    LoadXlsx --> GetSheet["Pilih Lembar Kerja Aktif / Pertama"]
    LoadCsv --> GetSheet
    
    GetSheet --> ReadHeaders["Ekstraksi Baris Header Kolom 1"]
    ReadHeaders --> CleanHeaders["Header Sanitization:<br/>- Trim Spasi Kiri/Kanan<br/>- Normalisasi Huruf/Case"]
    
    CleanHeaders --> LoopRows["Iterasi Setiap Baris Data Berikutnya"]
    
    subgraph RowSanitization["Sanitasi Data Tiap Baris"]
        LoopRows --> CheckEmpty{"Apakah Seluruh Sel Kosong?"}
        CheckEmpty -->|Ya| SkipRow["Abaikan / Lewati Baris"]
        CheckEmpty -->|Tidak| ParseCells["Ekstraksi Nilai Tiap Sel"]
        
        ParseCells --> CheckDate{"Apakah Tipe Data Date?"}
        CheckDate -->|Ya| ConvertDate["Konversi ke Teks Tanggal Indonesia<br/>Contoh: 17 Agustus 2026<br/>(Cegah serial angka 45546)"]
        CheckDate -->|Tidak| CheckRich{"Apakah Rich Text / Formula?"}
        
        CheckRich -->|Ya| ExtractFormula["Ambil Nilai Akhir / Result Text"]
        CheckRich -->|Tidak| TrimText["Trim Spasi Teks Biasa"]
        
        ConvertDate --> BuildRow["Bentuk Objek Data Penerima"]
        ExtractFormula --> BuildRow
        TrimText --> BuildRow
    end
    
    BuildRow --> AddToList["Tambahkan ke Koleksi Data Siap Cetak"]
    AddToList --> LoopRows
    SkipRow --> LoopRows
    
    LoopRows -->|Semua Baris Selesai| FinalData[/"Array Data Penerima Valid"/]
```

---

## 6. Alur Verifikasi Dokumen Digital (Verification Flow)

Diagram alur berikut mengilustrasikan bagaimana berkas sertifikat diperiksa integritasnya secara luring (*offline verification*) atau melalui portal web:

```mermaid
flowchart TD
    StartVerify(["Mulai Verifikasi Dokumen"]) --> InputDoc[/"Unggah Dokumen PDF"/]
    InputDoc --> ExtractSig["Ekstraksi Signature Dictionaries & Revisions"]
    
    ExtractSig --> CheckPAdES{"Apakah Memuat Tanda Tangan PAdES Valid?"}
    CheckPAdES -->|Tidak| InvalidNoSig["Status: TIDAK SAH<br/>Dokumen tidak memiliki tanda tangan digital resmi"]
    
    CheckPAdES -->|Ya| InspectRevisions["Periksa Seluruh Riwayat Revisi PDF"]
    
    InspectRevisions --> CheckByteRange["Verifikasi Hash ByteRange Tiap Tanda Tangan"]
    CheckByteRange --> ByteRangeValid{"Hash ByteRange Cocok?"}
    ByteRangeValid -->|Tidak| InvalidTamper["Status: TIDAK SAH (DOKUMEN DIMODIFIKASI)<br/>Perubahan isi PDF terdeteksi setelah ditandatangani"]
    
    ByteRangeValid -->|Ya| VerifyCertChain["Verifikasi Rantai Sertifikat X.509"]
    VerifyCertChain --> CertCheck{"Diterbitkan oleh Root CA Resmi & Belum Kadaluarsa?"}
    CertCheck -->|Tidak| InvalidCert["Status: PERINGATAN<br/>Sertifikat tidak dipercaya atau telah kedaluwarsa"]
    
    CertCheck -->|Ya| CheckQuorum{"Apakah Seluruh Pejabat Berwenang Telah Menandatangani?"}
    CheckQuorum -->|Belum Lengkap| PartialValid["Status: SEBAGIAN<br/>Dokumen sah namun masih menunggu tanda tangan pejabat lain"]
    CheckQuorum -->|Lengkap| FullyValid["Status: SAH & RESMI LENGKAP<br/>Integritas terjamin, kuorum terpenuhi, tanda tangan valid"]
    
    InvalidNoSig --> FinishVerify(["Hasil Verifikasi Ditampilkan"])
    InvalidTamper --> FinishVerify
    InvalidCert --> FinishVerify
    PartialValid --> FinishVerify
    FullyValid --> FinishVerify
```

---

## 💡 Ringkasan Praktik Terbaik

- **Keamanan Tanpa Kompromi**: Tanda tangan digital disematkan di tingkat biner PDF (`Incremental Updates`), sehingga compliant dengan pembaca PDF seperti Adobe Acrobat.
- **Kedaulatan Data Penuh**: Tidak ada satu byte pun dokumen penerima atau kunci privat yang meninggalkan peramban.
- **Transparansi Matematika**: Setiap hash dan proses enkripsi dapat divalidasi silang menggunakan perkakas standar industri (`openssl`, `sha256sum`).
