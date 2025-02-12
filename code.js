const TOKEN = "8039252069:AAHr4IVx94PGO_mk46WGPQqpNMQk31EkHPE";
const API_URL = `https://api.telegram.org/bot${TOKEN}`;
const SHEET_ID = "12Xx0wjNkAC78vUudv5ksjdhvzSPDsfvHcyMPK-KX_5E";
const ADMIN_IDS = ["5051988571"];
const startMessage = `
*Chào mừng bạn đến với ứng dụng quản lý tài chính cá nhân!*\n\n` +
  `📌 *Hướng dẫn sử dụng:*\n\n` +
  `1️⃣ *Thêm giao dịch:*\n   _Nhập theo cú pháp:_ <số tiền> <thu/chi> <mô tả>.\n` +
  `   *Ví dụ:* \`14629k thu Lương t1\`\n\n` +
  `2. *Xem báo cáo:*\n` +
  `   - \`/report\`: Báo cáo tổng.\n` +
  `   - \`/report mm/yyyy\`: Báo cáo tháng.\n` +
  `   - \`/report dd/mm/yyyy\`: Báo cáo tuần (hiển thị tuần có ngày được chọn).\n` +
  `   - Thêm "az" hoặc "za" sau lệnh để sắp xếp:\n` +
  `     *Ví dụ:* \`/report az\` hoặc \`/report 01/2024 za\`\n` +
  `   - \`/getuid\`: Lấy userId của bản thân.\n\n` +
  `3️⃣ *Quản lý người dùng(chỉ Admin):*\n` +
  `   - \`/addusers <id>\`: _Thêm user._\n` +
  `   - \`/delusers <id>\`: _Xóa user._\n\n` +
  `4️⃣ *Khác:*\n` +
  `   - \`/undo\`: _Xóa giao dịch gần nhất._\n` +
  `   - \`/reset\`: _Xóa dữ liệu của bản thân._\n` +
  `   - \`/resetall\`: _Xóa tất cả dữ liệu (admin only)._\n\n` +
  `💡 *Lưu ý:*\n` +
  `- Số tiền có thể nhập dạng "1234k" (1,234,000) hoặc "1tr" (1,000,000).\n`
  ;

function doPost(e) {
  const { message } = JSON.parse(e.postData.contents);
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;
  const userName = message.from.first_name;

  if (!isCommand(text)) {
    return;
  }

  if (text.startsWith("/start")) {
    sendStartMessage(chatId);
  } else if (text.startsWith("/getuid")) {
    sendMessage(chatId, `ℹ️ *ID của bạn:* \`${userId}\``);
  } else if (text.startsWith("/help")) {
    sendMessage(chatId, startMessage);
  }

  if (!isAuthorizedUser(userId)) {
    sendMessage(chatId, "🚫 Bạn không có quyền sử dụng bot này.");
    return;
  }

  if (text.startsWith("/addusers") || text.startsWith("/delusers")) {
    if (!isAdmin(userId)) {
      sendMessage(chatId, "🚫 Bạn không phải là admin.");
      return;
    }
    manageUsers(chatId, text);
  } else {
    if (text.startsWith("/report")) {
      handleReport(chatId, text, userId);
    } else if (text.startsWith("/resetall")) {
      resetSheet(chatId, userId);
    } else if (text.startsWith("/reset")) {
      resetUserSheet(chatId, userId);
    } else if (text.startsWith("/undo")) {
      undoLast(chatId, userId);
    } else {
      const transactionPattern = /^[0-9]+(k|tr)?\s+(thu|chi)\s+.+/i;
      if (transactionPattern.test(text)) {
        handleTransaction(chatId, text, userId, userName);
      }
    }
  }
}

function isCommand(text) {
  if (!text) return false;

  const validCommands = ["/start", "/addusers", "/delusers", "/report", "/reset", "/undo", "/getuid", "/resetall", "/help"];
  if (validCommands.some(cmd => text.startsWith(cmd))) {
    return true;
  }
  const transactionPattern = /^[0-9]+(k|tr)?\s+(thu|chi)\s+.+/i;
  return transactionPattern.test(text);
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(String(userId));
}

function isAuthorizedUser(userId) {
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return ADMIN_IDS.includes(String(userId));
  const userIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  return ADMIN_IDS.includes(String(userId)) || userIds.includes(String(userId));
}

function sendStartMessage(chatId) {
  ensureSheetsExist();
  sendMessage(chatId, startMessage);
}

function getOrCreateUserSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let usersSheet = ss.getSheetByName("users");

  if (!usersSheet) {
    usersSheet = ss.insertSheet("users");
    usersSheet.appendRow(["UserID"]);
  }

  return usersSheet;
}

function ensureSheetsExist() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let transactionsSheet = ss.getSheetByName("transactions");
  if (!transactionsSheet) {
    transactionsSheet = ss.insertSheet("transactions");
    transactionsSheet.appendRow(["Thời gian", "Uid", "Tên", "Loại", "Số tiền", "Mô tả"]);
  }

  let usersSheet = ss.getSheetByName("users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("users");
    usersSheet.appendRow(["UserID"]);
  }
}

function handleTransaction(chatId, text, userId, userName) {
  const [amount, type, ...desc] = text.split(" ");
  if (!isValidAmount(amount) || !["thu", "chi"].includes(type.toLowerCase())) {
    sendMessage(chatId, "⚠️ *Lỗi:* Vui lòng nhập đúng cú pháp:\n`<số tiền> <thu/chi> <mô tả>`");
    return;
  }

  const description = desc.join(" ");
  const formattedDesc = description.charAt(0).toUpperCase() + description.slice(1);
  const parsedAmount = parseAmount(amount);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("transactions");
  sheet.appendRow([
    new Date(),
    userId,
    userName,
    type.toLowerCase(),
    parsedAmount,
    formattedDesc || "Không có mô tả"
  ]);

  const currentTime = new Date().toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false
  });

  const responseMessage = [
    "✅ *Đã thêm giao dịch mới thành công!*",
    "",
    `⏰ *Thời gian:* ${currentTime}`,
    `💰 *Số tiền:* ${formatCurrency(parsedAmount)}`,
    `${type.toLowerCase() === "thu" ? "📈" : "📉"} *Loại:* ${type.toLowerCase() === "thu" ? "Thu nhập" : "Chi tiêu"}`,
    `📝 *Mô tả:* ${formattedDesc || "Không có mô tả"}`
  ].join("\n");

  sendMessage(chatId, responseMessage);
}

function manageUsers(chatId, text) {
  const args = text.split(" ");
  const command = args[0];
  const targetUserId = args[1];

  if (!targetUserId) {
    sendMessage(chatId, "🚫 Bạn cần cung cấp ID người dùng.");
    return;
  }

  if (command === "/addusers") {
    addUser(chatId, targetUserId);
  } else if (command === "/delusers") {
    removeUser(chatId, targetUserId);
    resetUserSheet(chatId, targetUserId);
  } else {
    sendMessage(chatId, "🚫 Lệnh không hợp lệ.");
  }
}

function addUser(chatId, targetUserId) {
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();

  const existingUsers = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String)
    : [];

  if (existingUsers.includes(targetUserId)) {
    sendMessage(chatId, `🚫 Người dùng ID ${targetUserId} đã có trong danh sách.`);
    return;
  }

  sheet.appendRow([targetUserId]);
  sendMessage(chatId, `✅ Đã thêm người dùng với ID ${targetUserId}.`);
}

function removeUser(chatId, targetUserId) {
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    sendMessage(chatId, `🚫 Không có người dùng nào trong danh sách.`);
    return;
  }

  const userIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  const userIndex = userIds.indexOf(String(targetUserId));

  if (userIndex === -1) {
    sendMessage(chatId, `🚫 Không tìm thấy người dùng với ID ${targetUserId}.`);
    return;
  }

  sheet.deleteRow(userIndex + 2);
  sendMessage(chatId, `✅ Đã xóa người dùng với ID ${targetUserId}.`);
}

function handleReport(chatId, text, userId) {
  const dateRegex = /\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{4}/;
  const dateParam = text.match(dateRegex)?.[0];
  let filter = "all";
  let sortOrder = null;

  if (text.includes("az")) {
    sortOrder = "az";
  } else if (text.includes("za")) {
    sortOrder = "za";
  }

  if (dateParam) {
    filter = dateParam.length === 7 ? "month" : "week";
  }

  generateReport(chatId, filter, dateParam, sortOrder, userId);
}

function generateReport(chatId, filter, dateParam, sortOrder, userId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("transactions");
  if (!sheet) {
    sendMessage(chatId, "⚠️ *Lỗi:* Không tìm thấy sheet `transactions`.");
    return;
  }

  const data = sheet.getDataRange().getValues().slice(1);

  if (!data.length) {
    sendMessage(chatId, "📊 *Thông báo:* Không có dữ liệu để tạo báo cáo.");
    return;
  }

  const now = parseDate(filter, dateParam);
  const filteredData = data.filter(([date, uid]) =>
    uid === userId && isValidDate(new Date(date), filter, now)
  );

  if (sortOrder) {
    filteredData.sort((a, b) => {
      const amountA = a[4];
      const amountB = b[4];
      return sortOrder === "az" ? amountA - amountB : amountB - amountA;
    });
  }

  const incomeTransactions = [];
  const expenseTransactions = [];
  let [income, expense] = [0, 0];

  filteredData.forEach(([date, uid, userName, type, amount, desc]) => {
    const formattedReportDate = new Date(date).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour12: false,
    });

    const transaction = `- \`${formatCurrency(amount)}\` : ${desc || "Không có mô tả"} | \`${formattedReportDate}\``;

    if (type === "thu") {
      income += amount;
      incomeTransactions.push(transaction);
    } else if (type === "chi") {
      expense += amount;
      expenseTransactions.push(transaction);
    }
  });

  if (!filteredData.length) {
    const range = filter === "week" ? "tuần" : "tháng";
    sendMessage(chatId, `⚠️ *Thông báo:* Không có giao dịch nào trong ${range} được yêu cầu.`);
    return;
  }

  const weekInfo =
    filter === "week"
      ? `\n📅 *Thời gian:* ${now.startOfWeek.toLocaleDateString("vi-VN")} - ${now.endOfWeek.toLocaleDateString("vi-VN")}`
      : "";

  let reportTitle;
  switch (filter) {
    case "all":
      reportTitle = "📊 *BÁO CÁO TỔNG HỢP*";
      break;
    case "month":
      reportTitle = `📊 *BÁO CÁO THÁNG ${dateParam}*`;
      break;
    case "week":
      reportTitle = "📊 *BÁO CÁO TUẦN*";
      break;
  }

  const balance = income - expense;
  const balanceIcon = balance >= 0 ? "📈" : "📉";

  const report = [
    reportTitle,
    weekInfo,
    "",
    "💰 *TỔNG QUAN*",
    `├─ 📥 Thu nhập: \`${formatCurrency(income)}\``,
    `├─ 📤 Chi tiêu: \`${formatCurrency(expense)}\``,
    `└─ ${balanceIcon} Cân đối: \`${formatCurrency(balance)}\`\n`,
    "",
    "📋 *CHI TIẾT*",
    "",
    "📥 *Giao dịch thu nhập:*",
    incomeTransactions.length ? incomeTransactions.join("\n") : "      💬 Không có giao dịch thu nhập",
    "",
    "📤 *Giao dịch chi tiêu:*",
    expenseTransactions.length ? expenseTransactions.join("\n") : "      💬 Không có giao dịch chi tiêu",
    "",
    sortOrder ? `\n🔄 *Sắp xếp:* ${sortOrder === "az" ? "Tăng dần" : "Giảm dần"}` : "",
  ].filter(Boolean).join("\n");

  sendMessage(chatId, report);
}

function resetSheet(chatId, userId) {
  try {
    if (!isAdmin(userId)) {
      sendMessage(chatId, "🚫 Bạn không phải là admin.");
      return;
    }
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("transactions");
    if (!sheet) {
      sendMessage(chatId, "⚠️ *Lỗi:* Không tìm thấy sheet `transactions`.");
      return;
    }
    sheet.clear();
    sheet.appendRow(["Thời gian", "Uid", "Tên", "Loại", "Số tiền", "Mô tả"]);
    sendMessage(chatId, "✅ *Đã xóa toàn bộ dữ liệu.*", true);
  } catch (error) {
    console.error("Lỗi trong hàm resetSheet:", error);
    sendMessage(chatId, "❌ *Đã xảy ra lỗi khi xóa dữ liệu.*", true);
  }
}

function resetUserSheet(chatId, userId) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("transactions");

    if (!sheet) {
      sendMessage(chatId, "⚠️ *Lỗi:* Không tìm thấy sheet `transactions`.");
      return;
    }

    const data = sheet.getDataRange().getValues();
    const filteredData = data.filter(row => row[1] !== userId);

    sheet.clear();
    sheet.appendRow(["Thời gian", "Uid", "Tên", "Loại", "Số tiền", "Mô tả"]);

    if (filteredData.length > 1) {
      sheet.getRange(2, 1, filteredData.length - 1, filteredData[0].length).setValues(filteredData.slice(1));
    }

    sendMessage(chatId, "✅ *Đã xóa toàn bộ dữ liệu.*", true);
  } catch (error) {
    console.error("Lỗi trong hàm resetSheet:", error);
    sendMessage(chatId, "❌ *Đã xảy ra lỗi khi xóa dữ liệu.*", true);
  }
}

function undoLast(chatId, userId) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("transactions");
    if (!sheet) {
      sendMessage(chatId, "⚠️ *Lỗi:* Không tìm thấy sheet `transactions`.");
      return;
    }
    const data = sheet.getDataRange().getValues();
    const lastUserTransactionIndex = data.map(row => row[1]).lastIndexOf(userId);

    if (lastUserTransactionIndex > 0) {
      sheet.deleteRow(lastUserTransactionIndex + 1);
      sendMessage(chatId, "✅ *Đã xóa giao dịch gần nhất của bạn.*", true);
    } else {
      sendMessage(chatId, "ℹ️ *Không có giao dịch nào của bạn để xóa.*", true);
    }
  } catch (error) {
    console.error("Lỗi trong hàm undoLast:", error);
    sendMessage(chatId, "❌ *Đã xảy ra lỗi khi xóa giao dịch.*", true);
  }
}

function isValidDate(date, filter, now) {
  if (filter === "month") {
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
  if (filter === "week") {
    const { startOfWeek, endOfWeek } = now;
    return date >= startOfWeek && date <= endOfWeek;
  }
  return true;
}

function parseDate(filter, dateParam) {
  if (!dateParam) return new Date();
  const parts = dateParam.split("/");
  if (filter === "month" && parts.length === 2) {
    return new Date(parts[1], parts[0] - 1);
  }
  if (filter === "week" && parts.length === 3) {
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    const dayOfWeek = date.getDay() || 7;
    date.startOfWeek = new Date(date);
    date.startOfWeek.setDate(date.getDate() - dayOfWeek + 1);
    date.endOfWeek = new Date(date.startOfWeek);
    date.endOfWeek.setDate(date.startOfWeek.getDate() + 6);
    return date;
  }
  return new Date();
}

function parseAmount(amount) {
  return parseFloat(amount.replace(/tr/gi, "000000").replace(/k/gi, "000")) || 0;
}

function isValidAmount(amount) {
  return /^[0-9]+(k|tr)?$/i.test(amount);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function sendMessage(chatId, text) {
  const MAX_MESSAGE_LENGTH = 4096;
  if (text.length <= MAX_MESSAGE_LENGTH) {
    UrlFetchApp.fetch(`${API_URL}/sendMessage`, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } else {
    const parts = splitMessage(text, MAX_MESSAGE_LENGTH);
    parts.forEach(part => {
      UrlFetchApp.fetch(`${API_URL}/sendMessage`, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ chat_id: chatId, text: part, parse_mode: "Markdown" }),
      });
    });
  }
}

function splitMessage(text, maxLength) {
  const parts = [];
  while (text.length > maxLength) {
    let part = text.slice(0, maxLength);
    const lastNewLineIndex = part.lastIndexOf('\n');
    if (lastNewLineIndex > -1) {
      part = text.slice(0, lastNewLineIndex + 1);
    }
    parts.push(part);
    text = text.slice(part.length);
  }
  parts.push(text);
  return parts;
}
