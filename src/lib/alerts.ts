import Swal from 'sweetalert2';

// Dark Modern custom styles for SweetAlert2 matching the app theme
const darkThemeConfig = {
  background: '#0f172a',
  color: '#f8fafc',
  confirmButtonColor: '#6366f1',
  cancelButtonColor: '#334155',
  customClass: {
    popup: 'swal2-dark-custom-popup',
    title: 'swal2-dark-custom-title',
    htmlContainer: 'swal2-dark-custom-html',
    confirmButton: 'btn btn-primary',
    cancelButton: 'btn btn-secondary',
  },
  buttonsStyling: false,
};

/**
 * Show modern success modal alert
 */
export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    ...darkThemeConfig,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Selesai',
  });
};

/**
 * Show compact modern success toast
 */
export const showSuccessToast = (title: string) => {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    background: '#1e293b',
    color: '#f8fafc',
  });
};

/**
 * Show modern error modal alert
 */
export const showErrorAlert = (title: string, text?: string) => {
  return Swal.fire({
    ...darkThemeConfig,
    icon: 'error',
    title,
    text: text || 'Terjadi kesalahan sistem.',
    confirmButtonText: 'Tutup',
    confirmButtonColor: '#ef4444',
  });
};

/**
 * Show modern confirmation modal
 */
export const showConfirmDialog = async (
  title: string,
  text: string,
  confirmButtonText: string = 'Ya, Lanjutkan'
): Promise<boolean> => {
  const result = await Swal.fire({
    ...darkThemeConfig,
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Batal',
    reverseButtons: true,
  });
  return result.isConfirmed;
};

/**
 * Show batch reset choice dialog (Keep Template vs Full Reset)
 */
export const showBatchResetOptionsDialog = async (): Promise<'keep_template' | 'reset_all' | null> => {
  const result = await Swal.fire({
    ...darkThemeConfig,
    icon: 'question',
    title: 'Mulai Buat Batch Baru?',
    html: `
      <div style="text-align: left; font-size: 0.82rem; color: #94a3b8; line-height: 1.5;">
        <p style="margin-bottom: 0.75rem;">
          Pilih opsi pembuatan batch untuk sertifikat berikutnya:
        </p>
        <div style="background: rgba(255,255,255,0.04); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 0.75rem;">
          <div style="font-weight: 600; color: #38bdf8; margin-bottom: 0.2rem;">Opsi 1: Pertahankan Template (Rekomendasi)</div>
          <div style="font-size: 0.78rem;">Data peserta & berkas sertifikat sebelumnya dikosongkan, namun desain template sertifikat tetap dipertahankan (langsung ke Step 2).</div>
        </div>
        <div style="background: rgba(255,255,255,0.04); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 0.75rem;">
          <div style="font-weight: 600; color: #f59e0b; margin-bottom: 0.2rem;">Opsi 2: Reset Penuh Alur</div>
          <div style="font-size: 0.78rem;">Mengosongkan data peserta, dokumen sertifikat, dan template kanvas kembali ke bentuk awal (kembali ke Step 1).</div>
        </div>
        <p style="font-size: 0.75rem; color: #10b981; margin: 0;">
          🔒 Kunci privat & sertifikat X.509 Authorized Signer di PKI Hub tetap aman di kedua opsi.
        </p>
      </div>
    `,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Pertahankan Template',
    denyButtonText: 'Reset Penuh Alur',
    cancelButtonText: 'Batal',
    reverseButtons: false,
    customClass: {
      popup: 'swal2-dark-custom-popup',
      title: 'swal2-dark-custom-title',
      htmlContainer: 'swal2-dark-custom-html',
      confirmButton: 'btn btn-primary',
      denyButton: 'btn btn-warning',
      cancelButton: 'btn btn-secondary',
    },
  });

  if (result.isConfirmed) return 'keep_template';
  if (result.isDenied) return 'reset_all';
  return null;
};
