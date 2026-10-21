/** A text value from FormData. Missing values and unexpected files become "". */
export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
