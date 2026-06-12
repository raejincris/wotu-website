/* Validation message tiếng Việt cho form (CartDrawer, form tư vấn, Contact,
 * Newsletter). Trình duyệt mặc định hiện message theo ngôn ngữ hệ điều hành —
 * user Việt dùng máy tiếng Anh sẽ thấy "Please fill out this field".
 * Dùng setCustomValidity + bubble native (không inline span → không CLS).
 *
 * Override per-field qua attribute: data-error-required / data-error-pattern /
 * data-error-type (vd input phone: data-error-pattern="Số điện thoại gồm 9–12 chữ số"). */

function messageFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const v = el.validity;
  const d = el.dataset;
  if (v.valueMissing) {
    if (d.errorRequired) return d.errorRequired;
    const type = (el as HTMLInputElement).type;
    if (type === 'tel') return 'Vui lòng nhập số điện thoại.';
    if (type === 'email') return 'Vui lòng nhập địa chỉ email.';
    return 'Vui lòng điền thông tin này.';
  }
  if (v.patternMismatch) {
    if (d.errorPattern) return d.errorPattern;
    if ((el as HTMLInputElement).type === 'tel') return 'Số điện thoại gồm 9–12 chữ số.';
    return 'Định dạng chưa đúng, bạn kiểm tra lại giúp nhé.';
  }
  if (v.typeMismatch) {
    if (d.errorType) return d.errorType;
    if ((el as HTMLInputElement).type === 'email') return 'Email chưa đúng định dạng (vd: ten@gmail.com).';
    return 'Định dạng chưa đúng, bạn kiểm tra lại giúp nhé.';
  }
  if (v.tooShort) return `Cần ít nhất ${(el as HTMLInputElement).minLength} ký tự.`;
  if (v.tooLong) return `Tối đa ${(el as HTMLInputElement).maxLength} ký tự.`;
  return '';
}

/** Gắn validation message tiếng Việt cho mọi field trong form. */
export function viValidate(form: HTMLFormElement): void {
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="checkbox"]), textarea, select',
  );
  fields.forEach((el) => {
    // `invalid` bắn khi submit fail validation → set message TRƯỚC khi bubble hiện.
    el.addEventListener('invalid', () => el.setCustomValidity(messageFor(el)));
    // Gõ lại → clear message (nếu không, field kẹt invalid mãi dù đã sửa đúng).
    el.addEventListener('input', () => el.setCustomValidity(''));
  });
}
