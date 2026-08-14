const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const utcOffsetPattern = /^[+-](0\d|1[0-4]):[0-5]\d$/;

export function parseLocalDateTimeWithOffset(value: string, offset: string) {
  if (!localDateTimePattern.test(value) || !utcOffsetPattern.test(offset)) {
    throw new Error("Invalid local date or UTC offset");
  }
  const date = new Date(`${value}:00${offset}`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}
