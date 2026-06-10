const aiParser = require("../services/aiParser");
const authLinkService = require("../services/authLinkService");
const dbService = require("../services/dbService");
const nl2sqlService = require("../services/nl2sqlService");
const logger = require("../utils/logger");
const {
  classifyMessage,
  hasDashboardIntent,
} = require("../utils/messageClassifier");
const { maybeSendSpendingAlert } = require("../services/spendingAlertService");
const { BOT_REPLY_CONFIG } = require("../config/prompts");

const HELP_COMMANDS = new Set(["/help", "help", "bantuan"]);
const START_COMMANDS = new Set(["/start", "start"]);
const GREETING_COMMANDS = new Set(["hi", "hello", "hai", "halo"]);

function isDashboardAccessCommand(text) {
  return hasDashboardIntent(text);
}

function isHelpCommand(text) {
  return HELP_COMMANDS.has(
    String(text || "")
      .trim()
      .toLowerCase(),
  );
}

function isStartCommand(text) {
  return START_COMMANDS.has(
    String(text || "")
      .trim()
      .toLowerCase(),
  );
}

function isGreetingCommand(text) {
  return GREETING_COMMANDS.has(
    String(text || "")
      .trim()
      .toLowerCase(),
  );
}

function buildRegisterUrl(message) {
  const baseUrl = process.env.WEB_APP_URL || "http://localhost:3000";
  const target = new URL("/register", baseUrl);

  target.searchParams.set("telegram_user_id", message.senderId);
  target.searchParams.set("whatsapp", message.senderId);

  if (message.chatId) {
    target.searchParams.set("chat_id", message.chatId);
  }

  if (message.username) {
    target.searchParams.set("username", message.username);
  }

  return target.toString();
}

function buildHelpText() {
  return [
    "Aku bisa bantu kamu catat pengeluaran, pemasukan, dan tabungan langsung dari WhatsApp.",
    "",
    "Perintah yang bisa dipakai:",
    "/start - lihat sapaan & panduan singkat",
    "/help - lihat bantuan",
    "/dashboard - minta link masuk dashboard",
    "",
    "Contoh catatan yang bisa langsung kamu kirim:",
    '• "Bakso 15rb"',
    '• "Gaji freelance 2 juta"',
    '• "Nabung Dana Darurat 500rb"',
    "",
    "Kalau mau masuk ke web, kamu juga bisa pakai bahasa natural seperti:",
    '• "dashboard"',
    '• "berikan dashboard"',
    '• "link web"',
    '• "buka dashboard"',
    '• "mau lihat ringkasan"',
    "",
    "Kamu juga bisa kirim foto struk atau voice note kalau fitur medianya aktif.",
  ].join("\n");
}

function buildOnboardingText(userName) {
  const name = userName || "Sobat Cuan";

  return [
    `Halo ${name}! Selamat datang di *HitungUang Bot* 🚀`,
    "",
    "Aku akan bantu kamu mencatat pemasukan, pengeluaran, dan tabungan dengan cara yang simpel langsung dari WhatsApp.",
    "",
    "Contoh yang bisa langsung kamu kirim:",
    '• "Bakso 15rb"',
    '• "Gaji freelance 2jt"',
    '• "Nabung Dana Darurat 500rb"',
    "",
    "Kalau mau buka dashboard, tinggal ketik saja:",
    '• "dashboard"',
    '• "buka dashboard"',
    '• "link web"',
    '• "mau lihat ringkasan"',
    "",
    "Yuk mulai catat biar keuanganmu makin rapi ✨",
  ].join("\n");
}

async function replyUnregistered(message) {
  const registerUrl = buildRegisterUrl(message);

  const welcomeText = [
    "Halo! Aku HitungUang Bot.",
    "",
    "Nomor WhatsApp kamu belum terdaftar, jadi aku belum bisa bantu catat transaksi atau kirim akses dashboard.",
    "",
    "Daftar dulu di link ini ya:",
    registerUrl,
    "",
    'Setelah selesai daftar, kamu bisa langsung kirim catatan seperti "Bakso 15rb" atau ketik "dashboard".',
  ].join("\n");

  await message.reply(welcomeText);
}

function normalizeMessage(input) {
  return {
    text: String(input.text || "").trim(),
    hasMedia: Boolean(input.hasMedia),
    mediaType: input.mediaType || "text",
    senderId: String(input.senderId || ""),
    chatId: input.chatId ? String(input.chatId) : "",
    chatType: input.chatType || "private",
    displayName: input.displayName || "",
    username: input.username || "",
    reply: input.reply,
    downloadMedia: input.downloadMedia,
  };
}

function buildWalletChoiceReply(wallets) {
  const choices = wallets
    .slice(0, 3)
    .map((wallet, index) => `${index + 1}. ${wallet.nama_dompet}`)
    .join("\n");

  const exampleWallet = wallets[0] ? wallets[0].nama_dompet : "Dana Darurat";

  return [
    "Kamu punya beberapa dompet tabungan aktif, jadi aku perlu nama dompet tujuannya biar nggak salah catat.",
    "",
    choices,
    "",
    `Contoh: "Nabung ${exampleWallet} 100rb".`,
  ].join("\n");
}

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatTransactionLine(item) {
  const amount = formatCurrency(item.harga);

  if (item.tipe === "pemasukan") {
    return `💰 Pemasukan — ${item.item}: ${amount}`;
  }

  if (item.tipe === "tabungan") {
    const walletSuffix = item.nama_dompet_asli
      ? ` (${item.nama_dompet_asli})`
      : "";
    return `🏦 Tabungan — ${item.item}${walletSuffix}: ${amount}`;
  }

  return `💸 Pengeluaran — ${item.item}: ${amount}`;
}

function getLightTip(item) {
  if (!item) {
    return null;
  }

  if (item.tipe === "pemasukan") {
    return BOT_REPLY_CONFIG.tips.pemasukan;
  }

  if (item.tipe === "tabungan") {
    return BOT_REPLY_CONFIG.tips.tabungan;
  }

  return BOT_REPLY_CONFIG.tips[item.kategori] || BOT_REPLY_CONFIG.tips.lainnya;
}

function buildDashboardReply(link) {
  return [
    "Siap, ini link untuk masuk ke dashboard HitungUang kamu:",
    "",
    link,
    "",
    "Link ini bersifat pribadi, jadi jangan dibagikan ke orang lain ya.",
    'Kalau nanti link-nya kedaluwarsa, tinggal ketik "dashboard" lagi.',
  ].join("\n");
}

function buildDuplicateReply() {
  return [
    "Catatan ini sepertinya sudah pernah tersimpan sebelumnya, jadi aku tidak mencatatnya dua kali ya.",
    "",
    "Kalau kamu memang ingin mencatat transaksi baru, coba kirim ulang dengan detail yang sedikit berbeda.",
  ].join("\n");
}

function buildParseErrorReply() {
  return [
    "Maaf, aku belum berhasil memahami catatan itu.",
    "",
    "Coba pakai format yang lebih jelas seperti:",
    '• "Bakso 15rb"',
    '• "Gaji freelance 2 juta"',
    '• "Nabung Dana Darurat 500rb"',
  ].join("\n");
}

function buildNaturalConfirmation({
  items,
  insertResult,
  currentAvailableMoney,
}) {
  const lines = [];
  const primaryItem = items[0];

  if (items.length === 1) {
    if (primaryItem.tipe === "pemasukan") {
      lines.push(
        `${BOT_REPLY_CONFIG.openers.income}, pemasukan ${formatCurrency(primaryItem.harga)} dari ${primaryItem.item} sudah dicatat ya.`,
      );
    } else if (primaryItem.tipe === "tabungan") {
      const walletSuffix = primaryItem.nama_dompet_asli
        ? ` ke dompet ${primaryItem.nama_dompet_asli}`
        : "";
      lines.push(
        `${BOT_REPLY_CONFIG.openers.saving}, tabungan ${formatCurrency(primaryItem.harga)}${walletSuffix} sudah masuk catatan.`,
      );
    } else {
      lines.push(
        `${BOT_REPLY_CONFIG.openers.expense}, pengeluaran ${formatCurrency(primaryItem.harga)} untuk ${primaryItem.item} sudah dicatat ya.`,
      );
    }

    if (primaryItem.lokasi) {
      lines.push(`Lokasi yang terbaca: ${primaryItem.lokasi}.`);
    }

    lines.push("", formatTransactionLine(primaryItem));
  } else {
    lines.push(
      `${BOT_REPLY_CONFIG.openers.multi}, ${items.length} transaksi berhasil dicatat ya.`,
    );
    lines.push("", "*Rincian:*");
    items.forEach((item) => {
      lines.push(formatTransactionLine(item));
    });

    const totalPemasukan = items
      .filter((item) => item.tipe === "pemasukan")
      .reduce((sum, item) => sum + Number(item.harga || 0), 0);

    const totalPengeluaran = items
      .filter((item) => item.tipe === "pengeluaran")
      .reduce((sum, item) => sum + Number(item.harga || 0), 0);

    const totalTabungan = items
      .filter((item) => item.tipe === "tabungan")
      .reduce((sum, item) => sum + Number(item.harga || 0), 0);

    if (totalPemasukan > 0) {
      lines.push(`\nTotal pemasukan: ${formatCurrency(totalPemasukan)}`);
    }

    if (totalPengeluaran > 0) {
      lines.push(`Total pengeluaran: ${formatCurrency(totalPengeluaran)}`);
    }

    if (totalTabungan > 0) {
      lines.push(`Total tabungan: ${formatCurrency(totalTabungan)}`);
    }
  }

  if (insertResult && insertResult.skippedCount > 0) {
    lines.push(
      "",
      `Catatan tambahan: ${insertResult.skippedCount} item duplikat tidak dicatat ulang.`,
    );
  }

  if (Number.isFinite(currentAvailableMoney)) {
    lines.push(
      "",
      `Available money bulan ini sekarang ${formatCurrency(currentAvailableMoney)}.`,
    );
  }

  const tip = getLightTip(primaryItem);
  if (tip) {
    lines.push("", tip);
  }

  lines.push("", BOT_REPLY_CONFIG.closers.default);
  return lines.join("\n");
}

async function handleMessage(input) {
  const message = normalizeMessage(input);
  const originalText = message.text;
  const sender = message.senderId;

  if (message.chatType !== "private") {
    logger.info(
      `Mengabaikan pesan non-private dari chat ${message.chatId || "-"}`,
    );
    return;
  }

  if (!sender || typeof message.reply !== "function") {
    throw new Error("Adapter pesan chat tidak lengkap.");
  }

  try {
    const callFirst = async (service, methodNames, ...args) => {
      for (const methodName of methodNames) {
        if (typeof service?.[methodName] === "function") {
          return await service[methodName](...args);
        }
      }
      return undefined;
    };

    const user =
      (await callFirst(
        dbService,
        [
          "getUserByTelegramId",
          "getUserByTelegramId",
          "findUserByTelegramId",
          "findUserByTelegramId",
        ],
        sender,
      )) ||
      (message.chatId
        ? await callFirst(
            dbService,
            ["getUserByChatId", "findUserByChatId"],
            message.chatId,
          )
        : null);

    if (isStartCommand(originalText)) {
      if (!user) {
        await replyUnregistered(message);
        return;
      }

      const displayName =
        user.nama ||
        user.name ||
        message.displayName ||
        message.username ||
        "Sobat Cuan";

      await message.reply(buildOnboardingText(displayName));
      return;
    }

    if (isHelpCommand(originalText)) {
      await message.reply(buildHelpText());
      return;
    }

    if (!user) {
      await replyUnregistered(message);
      return;
    }

    if (isGreetingCommand(originalText)) {
      await message.reply(buildHelpText());
      return;
    }

    if (isDashboardAccessCommand(originalText)) {
      const link = await authLinkService.requestAuthLink({
        telegramUserId: sender,
        purpose: "login_web",
        redirectTo: "/dashboard",
      });

      await message.reply(buildDashboardReply(link.actionLink));
      return;
    }

    const classification = classifyMessage({
      text: originalText,
      hasMedia: message.hasMedia,
    });

    if (!classification.shouldProcess) {
      await message.reply(
        [
          "Aku belum menangkap maksud pesan itu.",
          "",
          "Kalau mau, kamu bisa kirim salah satu contoh ini:",
          '• "Makan siang 25rb"',
          '• "Gaji 3jt"',
          '• "Nabung 200rb"',
          '• "dashboard"',
        ].join("\n"),
      );
      return;
    }

    if (classification.mode === "question") {
      const answer = await callFirst(
        nl2sqlService,
        [
          "answerQuestion",
          "processQuestion",
          "handleQuestion",
          "queryQuestion",
          "runQueryFromText",
          "ask",
        ],
        {
          userId: user.id || user.user_id,
          text: classification.normalizedText,
          senderId: sender,
        },
      );

      if (typeof answer === "string" && answer.trim()) {
        await message.reply(answer.trim());
        return;
      }

      if (answer?.message) {
        await message.reply(String(answer.message).trim());
        return;
      }

      await message.reply(
        'Aku belum bisa menjawab pertanyaan itu sekarang. Coba pakai format yang lebih spesifik, atau ketik "dashboard" untuk lihat ringkasan lengkap.',
      );
      return;
    }

    let parsed = message.hasMedia
      ? await callFirst(
          aiParser,
          [
            "parseMediaMessage",
            "parseMedia",
            "parseFromMedia",
            "parseImageAudioVideo",
            "parse",
          ],
          {
            userId: user.id || user.user_id,
            text: originalText,
            mediaType: message.mediaType,
            downloadMedia: message.downloadMedia,
          },
        )
      : await callFirst(
          aiParser,
          [
            "parseTextMessage",
            "parseText",
            "parseTransactionText",
            "parsePlainText",
            "parse",
          ],
          {
            userId: user.id || user.user_id,
            text: originalText,
          },
        );

    if (!parsed && typeof aiParser?.parseExpense === "function") {
      parsed = await aiParser.parseExpense(originalText);
    }

    if (parsed?.data) {
      parsed = parsed.data;
    }

    const parsedItems = (Array.isArray(parsed) ? parsed : [parsed])
      .filter(Boolean)
      .map((item) => ({
        item: item.item || item.nama_item || item.description || "Transaksi",
        harga: Number(item.harga || item.amount || 0),
        lokasi: item.lokasi || item.location || null,
        kategori: item.kategori || item.category || "lainnya",
        tipe: (item.tipe || item.type || "pengeluaran").toLowerCase(),
        wallet_name: item.wallet_name || item.walletName || null,
      }))
      .filter(
        (item) => item.item && Number.isFinite(item.harga) && item.harga > 0,
      );

    if (!parsedItems.length) {
      await message.reply(buildParseErrorReply());
      return;
    }

    const wallets =
      (await callFirst(
        dbService,
        [
          "getUserWallets",
          "getWalletsByUserId",
          "findWalletsByUserId",
          "listUserWallets",
        ],
        user.id || user.user_id,
      )) || [];

    const activeWallets = Array.isArray(wallets)
      ? wallets.filter((wallet) => {
          const name = String(wallet.nama_dompet || wallet.name || "").trim();
          const isDeleted = Boolean(wallet.deleted_at || wallet.is_deleted);
          return name && !isDeleted;
        })
      : [];

    for (const item of parsedItems) {
      if (item.tipe !== "tabungan") {
        continue;
      }

      if (!item.wallet_name && activeWallets.length > 1) {
        await message.reply(buildWalletChoiceReply(activeWallets));
        return;
      }

      if (!item.wallet_name && activeWallets.length === 1) {
        item.wallet_name =
          activeWallets[0].nama_dompet || activeWallets[0].name;
        item.nama_dompet_asli = item.wallet_name;
      }

      if (item.wallet_name) {
        const normalizedRequestedWallet = String(item.wallet_name)
          .trim()
          .toLowerCase();
        const matchedWallet = activeWallets.find((wallet) => {
          const walletName = String(wallet.nama_dompet || wallet.name || "")
            .trim()
            .toLowerCase();
          return walletName === normalizedRequestedWallet;
        });

        if (!matchedWallet && activeWallets.length > 0) {
          await message.reply(
            [
              `Aku belum menemukan dompet tabungan bernama "${item.wallet_name}".`,
              "",
              "Dompet yang tersedia:",
              ...activeWallets.slice(0, 5).map((wallet, index) => {
                const walletName = wallet.nama_dompet || wallet.name;
                return `${index + 1}. ${walletName}`;
              }),
              "",
              "Coba kirim ulang dengan nama dompet yang sesuai ya.",
            ].join("\n"),
          );
          return;
        }

        if (matchedWallet) {
          item.wallet_id = matchedWallet.id || matchedWallet.wallet_id;
          item.nama_dompet_asli =
            matchedWallet.nama_dompet || matchedWallet.name;
        }
      }
    }

    const payload = parsedItems.map((item) => ({
      user_id: user.id || user.user_id,
      userId: user.id || user.user_id,
      item: item.item,
      harga: item.harga,
      lokasi: item.lokasi,
      kategori: item.kategori,
      tipe: item.tipe,
      wallet_id: item.wallet_id || null,
      wallet_name: item.wallet_name || null,
      source: message.hasMedia ? message.mediaType || "media" : "text",
      raw_text: originalText,
      rawText: originalText,
      whatsapp_user_id: sender,
      telegramUserId: sender,
    }));

    let insertResult = await callFirst(
      dbService,
      [
        "insertParsedTransactions",
        "saveParsedTransactions",
        "insertTransactions",
        "saveTransactions",
        "createTransactionsFromParsed",
        "appendTransactions",
      ],
      payload,
    );

    if (!insertResult && typeof dbService?.insertTransaction === "function") {
      const inserted = [];
      let skippedCount = 0;

      for (const row of payload) {
        try {
          const result = await dbService.insertTransaction(row);
          if (result?.skipped || result?.duplicate) {
            skippedCount += 1;
          } else {
            inserted.push(result || row);
          }
        } catch (err) {
          if (
            String(err?.message || "")
              .toLowerCase()
              .includes("duplicate") ||
            String(err?.message || "")
              .toLowerCase()
              .includes("sudah ada")
          ) {
            skippedCount += 1;
            continue;
          }
          throw err;
        }
      }

      insertResult = {
        insertedCount: inserted.length,
        skippedCount,
        insertedItems: inserted,
      };
    }

    if (
      insertResult &&
      Number(insertResult.insertedCount || 0) === 0 &&
      Number(insertResult.skippedCount || 0) > 0
    ) {
      await message.reply(buildDuplicateReply());
      return;
    }

    const latestSummary = await callFirst(
      dbService,
      [
        "getUserFinancialSummary",
        "getFinancialSummary",
        "getUserBalanceSummary",
        "getCurrentMoneySummary",
      ],
      user.id || user.user_id,
    );

    const currentAvailableMoney =
      latestSummary?.currentAvailableMoney ??
      latestSummary?.available_money ??
      latestSummary?.saldo_tersedia ??
      latestSummary?.balance ??
      null;

    if (payload.some((transaction) => transaction.tipe === "pengeluaran")) {
      await maybeSendSpendingAlert({
        message,
        user,
      });
    }

    const confirmationText = buildNaturalConfirmation({
      items: parsedItems,
      insertResult,
      currentAvailableMoney,
    });

    await message.reply(confirmationText);
  } catch (error) {
    logger.error("Gagal memproses pesan WhatsApp:", error);

    await message.reply(
      [
        "Maaf, aku sempat mengalami kendala saat memproses pesanmu.",
        "",
        "Coba kirim ulang dalam format yang singkat dan jelas, misalnya:",
        '• "Makan 20rb"',
        '• "Gaji 2jt"',
        '• "dashboard"',
      ].join("\n"),
    );
  }
}

module.exports = {
  handleMessage,
  isDashboardAccessCommand,
  buildHelpText,
  buildOnboardingText,
};
