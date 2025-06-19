enum Time {
    _24Hours = "24 hours",
    _48Hours = "48 hours",
    _84Months = "84 months",
  }

  export default function getExpirationTime(time: Time): string {
    const now = new Date();
    let expireAt: Date;
  
    switch (time) {
      case Time._24Hours:
        expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case Time._48Hours:
        expireAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        break;
      case Time._84Months:
        expireAt = new Date(now);
        expireAt.setMonth(now.getMonth() + 84);
        break;
      default:
        return "Invalid Time enum value.";
    }
  
    const year = expireAt.getFullYear();
    const month = String(expireAt.getMonth() + 1).padStart(2, '0');
    const day = String(expireAt.getDate()).padStart(2, '0');
    const hours = String(expireAt.getHours()).padStart(2, '0');
    const minutes = String(expireAt.getMinutes()).padStart(2, '0');
    const seconds = String(expireAt.getSeconds()).padStart(2, '0');
    const milliseconds = String(expireAt.getMilliseconds()).padStart(3, '0');
    const fractionalMilliseconds = milliseconds.padEnd(6, '0'); // Pad to 6 digits
    const utcOffset = "+00";
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${fractionalMilliseconds}${utcOffset}`;
  }