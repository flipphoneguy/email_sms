/**
 * ------------------------------------------------------------------
 * CONFIGURATION
 * ------------------------------------------------------------------
 */
const BOT_ID = "PASTE_YOUR_BOT_ID_HERE"; // <--- PASTE YOUR BOT ID HERE

// Library for HTML parsing (Cheerio)
// ID: 1ReeQ6WO8kKNxoaA_O0XEQ589cIrRvEBA9qcWpNqdOP17i47u6N9M5Xh0
const CHEERIO_LIB_ID = "1ReeQ6WO8kKNxoaA_O0XEQ589cIrRvEBA9qcWpNqdOP17i47u6N9M5Xh0";

/**
 * ------------------------------------------------------------------
 * ENTRY POINTS
 * ------------------------------------------------------------------
 */

// 1. Interactive Commands (triggered by GroupMe)
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // Ignore messages from bots (including ourselves)
    if (payload.sender_type === "bot") return;

    const text = payload.text.trim();
    const args = text.split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === "-help" || command === "-h") return sendHelp(args[1]);
    if (command === "-check") return checkForNewEmails(); // Manual trigger
    
    // Global Settings
    if (command === "-mute") return handleGlobalMute(true);
    if (command === "-unmute") return handleGlobalMute(false);
    if (command === "-timezone" || command === "-tz") return handleTimezone(args[1]);
    if (command === "-sendmode") return handleSendMode(args[1]);

    // Sender Blocking
    if (command === "-silence") return handleSilence(args[1], true);
    if (command === "-unsilence") return handleSilence(args[1], false);

    // Actions
    if (command === "-list" || command === "-ls") return handleList(args.slice(1));
    if (command === "-read" || command === "-r") return handleRead(args);
    if (command === "-reply" || command === "-re") return handleReply(text);
    if (command === "-send") return handleSendNew(text);
    if (command === "-delete" || command === "-del") return handleDelete(args[1]);
    if (command === "-move" || command === "-mv") return handleMove(text);
    if (command === "-mark") return handleMark(args[1], args[2]);
    if (command === "-search" || command === "-s") return handleSearch(args.slice(1));

  } catch (err) {
    send(`Critical Error: ${err.message}`);
  }
}

// 2. Auto-Forwarder (Trigger this to run every minute)
function checkForNewEmails() {
  const props = PropertiesService.getScriptProperties();
  
  // 1. Check Global Mute
  if (props.getProperty('GLOBAL_MUTE') === 'true') return;

  const silenced = JSON.parse(props.getProperty('SILENCED_SENDERS') || "[]");
  const labelName = "GroupMe_Notified";
  
  // Create label if it doesn't exist
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);

  // Search for unread, un-notified emails in inbox
  const threads = GmailApp.search(`in:inbox is:unread -label:${labelName}`);
  let count = 0;

  for (const thread of threads) {
    const msgs = thread.getMessages();
    // We only care about messages that are actually unread
    for (const msg of msgs) {
      if (!msg.isUnread()) continue;

      const from = msg.getFrom(); // "Name <email@domain.com>"
      const emailMatch = from.match(/<([^>]+)>/);
      const emailAddress = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase();

      // Check silence list
      if (silenced.some(s => emailAddress.includes(s.toLowerCase()))) {
        thread.addLabel(label); // Mark processed but don't send
        continue;
      }

      // Notification Format: "Name <email> | Subject"
      const cleanFrom = from.replace(/"/g, "").trim(); 
      const subject = msg.getSubject() || "(No Subject)";
      
      send(`New: ${cleanFrom} | ${subject}`);
      
      thread.addLabel(label);
      count++;
    }
  }
  if (count > 0) Logger.log(`Forwarded ${count} new emails.`);
}

/**
 * ------------------------------------------------------------------
 * COMMAND LOGIC
 * ------------------------------------------------------------------
 */

function handleList(args) {
  let query = "in:inbox"; 
  let start = 0;
  let max = 5;

  // Detect Range (e.g., "6-10" or "25-30")
  const rangeArg = args.find(a => a.includes("-") && /\d+-\d+/.test(a));
  
  if (rangeArg) {
    const parts = rangeArg.split("-").map(Number);
    let low = Math.min(parts[0], parts[1]);
    let high = Math.max(parts[0], parts[1]);
    
    // Convert 1-based range to 0-based offset
    if (low < 1) low = 1; 
    start = low - 1;
    max = high - low + 1;
  } else {
    // Check for single number (count)
    const countArg = args.find(a => !isNaN(a) && !a.includes("-"));
    if (countArg) max = parseInt(countArg);
  }

  // Keywords
  const lowerArgs = args.map(a => a.toLowerCase());
  if (lowerArgs.includes("spam")) query = "in:spam";
  else if (lowerArgs.includes("trash")) query = "in:trash";
  else if (lowerArgs.includes("sent")) query = "in:sent";
  else if (lowerArgs.includes("priority")) query = "category:primary";
  else if (lowerArgs.includes("social")) query = "category:social";
  else if (lowerArgs.includes("promotions")) query = "category:promotions";
  else if (lowerArgs.includes("updates")) query = "category:updates";

  performSearchAndList(query, start, max);
}

function handleRead(args) {
  // Case 1: "-read" (No arguments) -> Read the LATEST email in Inbox
  if (args.length === 1) {
    try {
      const threads = GmailApp.getInboxThreads(0, 1);
      if (threads.length === 0) return send("Inbox is empty.");
      const msg = threads[0].getMessages().pop(); 
      return sendEmailContent([msg]); 
    } catch (e) {
      return send(`Error: ${e.message}`);
    }
  }

  // Case 2: "-read 1", "-read 1 all", "-read 1 details", "-read 1 3"
  const index = args[1];
  const subArg = args[2] ? args[2].toLowerCase() : null; 

  const threadId = getThreadIdFromState(index);
  if (!threadId) return;

  try {
    const thread = GmailApp.getThreadById(threadId);
    const messages = thread.getMessages();
    let msgsToShow = [];
    let footerInfo = "";
    let isDetailsMode = false;

    if (subArg === "all") {
      msgsToShow = messages;
    } 
    else if (subArg === "details") {
      // Show summary of ALL messages
      msgsToShow = messages;
      isDetailsMode = true;
    }
    else if (subArg && !isNaN(subArg)) {
      // Show specific message index
      const msgIdx = parseInt(subArg) - 1;
      if (msgIdx >= 0 && msgIdx < messages.length) {
        msgsToShow = [messages[msgIdx]];
      } else {
        return send(`Invalid message number. Thread has ${messages.length} messages.`);
      }
    } 
    else {
      // Default: Show LATEST message
      msgsToShow = [messages[messages.length - 1]];
      
      if (messages.length > 1) {
        footerInfo = `\n\n[Msg ${messages.length} of ${messages.length}. Reply "-read ${index} all" for history or "-read ${index} details" for summary]`;
      }
    }

    if (isDetailsMode) {
        sendThreadDetails(msgsToShow);
    } else {
        sendEmailContent(msgsToShow, footerInfo);
    }

  } catch (e) {
    send(`Error reading: ${e.message}`);
  }
}

function sendThreadDetails(messages) {
    let content = "Thread Details:\n";
    messages.forEach((msg, i) => {
        const dateStr = formatDate(msg.getDate());
        const fromStr = msg.getFrom().replace(/"/g, "").trim();
        content += `\n${i + 1}. [${dateStr}] ${fromStr}\n   Sub: ${msg.getSubject()}`;
    });
    send(content);
}

function sendEmailContent(messages, footer = "") {
  let content = "";
  
  messages.forEach((msg, i) => {
    let body = msg.getPlainBody();
    if (!body || body.length < 50) {
      // HTML Fallback
      try {
        const $ = Cheerio.load(msg.getBody());
        body = $('body').text().replace(/\s\s+/g, ' ').trim();
      } catch (e) {}
    }
    
    const dateStr = formatDate(msg.getDate());
    const fromStr = msg.getFrom().replace(/"/g, "").trim();
    
    if (i > 0) content += "\n\n------------------\n\n";
    content += `Date: ${dateStr}\nFrom: ${fromStr}\nSub: ${msg.getSubject()}\n\n${body}`;
  });

  if (footer) content += footer;

  send(content);
}

function handleSearch(args) {
    // args passed here excludes the command itself (e.g. "from:amazon", "10")
    if (args.length === 0) return send("Enter a query. Ex: -search from:amazon");

    let count = 5; // Default
    let queryArgs = [...args];
    
    // Check if last argument is a number (limit)
    const lastArg = args[args.length - 1];
    if (!isNaN(lastArg)) {
        count = parseInt(lastArg);
        queryArgs.pop(); // Remove the number from query
    }

    const query = queryArgs.join(" ");
    performSearchAndList(query, 0, count);
}

function handleReply(fullText) {
  // Supports: "-reply 1; msg" OR "-reply 1 3; msg"
  const parts = fullText.split(';');
  
  // Parse the command side: "-reply 1" or "-reply 1 3"
  const commandSide = parts[0].trim().split(/\s+/);
  const threadIndex = commandSide[1];
  const msgIndexStr = commandSide[2]; // Optional specific message index

  const body = parts.slice(1).join(';').trim();

  if (!threadIndex || !body) return send("Use: -reply [thread_num] [optional_msg_num]; [message]");
  
  const threadId = getThreadIdFromState(threadIndex);
  if (!threadId) return;

  try {
    const thread = GmailApp.getThreadById(threadId);
    const messages = thread.getMessages();
    let targetMessage;

    if (msgIndexStr && !isNaN(msgIndexStr)) {
      // User wants to reply to a specific message in the thread
      const i = parseInt(msgIndexStr) - 1;
      if (i >= 0 && i < messages.length) {
        targetMessage = messages[i];
      } else {
        return send(`Invalid message number. This thread only has ${messages.length} messages.`);
      }
    } else {
      // Default: Reply to the latest message in the thread
      targetMessage = messages[messages.length - 1];
    }

    targetMessage.reply(body);
    send("Replied.");
  } catch (e) { send(`Error: ${e.message}`); }
}

function handleGlobalMute(mute) {
  PropertiesService.getScriptProperties().setProperty('GLOBAL_MUTE', mute.toString());
  send(mute ? "Notifications muted." : "Notifications active.");
}

function handleSilence(email, isSilencing) {
  if (!email) return send("Provide an email address.");
  const props = PropertiesService.getScriptProperties();
  let list = JSON.parse(props.getProperty('SILENCED_SENDERS') || "[]");
  
  if (isSilencing) {
    if (!list.includes(email.toLowerCase())) list.push(email.toLowerCase());
    send(`Silenced notifications from: ${email}`);
  } else {
    list = list.filter(e => e !== email.toLowerCase());
    send(`Unsilenced: ${email}`);
  }
  props.setProperty('SILENCED_SENDERS', JSON.stringify(list));
}

function handleTimezone(tz) {
  if (!tz) return send("Provide a timezone. Ex: -timezone America/New_York");
  PropertiesService.getScriptProperties().setProperty('USER_TIMEZONE', tz);
  send(`Timezone set to: ${tz}`);
}

function handleSendMode(mode) {
  if (!mode || (mode !== 'normal' && mode !== 'split')) return send("Use: -sendmode normal OR -sendmode split");
  PropertiesService.getScriptProperties().setProperty('SEND_MODE', mode);
  send(`Send mode set to: ${mode}`);
}

function handleDelete(index) {
  const id = getThreadIdFromState(index);
  if (id) { GmailApp.getThreadById(id).moveToTrash(); send("Deleted Thread."); }
}

function handleMove(text) {
  const parts = text.split(';');
  const id = getThreadIdFromState(parts[0].split(" ")[1]);
  if (!id) return;
  const label = parts[1].trim();
  const thread = GmailApp.getThreadById(id);
  
  if (label.toLowerCase() === 'inbox') thread.moveToInbox();
  else if (label.toLowerCase() === 'spam') thread.moveToSpam();
  else if (label.toLowerCase() === 'trash') thread.moveToTrash();
  else {
    const userLabel = GmailApp.getUserLabelByName(label);
    if (userLabel) { userLabel.addToThread(thread); thread.moveToArchive(); }
    else return send("Label not found.");
  }
  send(`Moved to ${label}.`);
}

function handleMark(index, action) {
  const id = getThreadIdFromState(index);
  if (!id) return;
  const thread = GmailApp.getThreadById(id);
  if (action === 'read') thread.markRead();
  else thread.markUnread();
  send(`Marked as ${action}.`);
}

function handleSendNew(text) {
  const p = text.split(";");
  if (p.length < 4) return send("Use: -send; to; sub; body");
  try {
    GmailApp.sendEmail(p[1].trim(), p[2].trim(), p[3].trim());
    send("Sent.");
  } catch (e) { send(`Error: ${e.message}`); }
}

/**
 * ------------------------------------------------------------------
 * CORE HELPERS
 * ------------------------------------------------------------------
 */

function performSearchAndList(query, start, max) {
  try {
    const threads = GmailApp.search(query, start, max);
    if (threads.length === 0) return send(`No emails found for: ${query}`);

    const mapping = {};
    let output = `Results [${start+1}-${start+threads.length}]:\n`;

    threads.forEach((thread, i) => {
      const msg = thread.getMessages()[thread.getMessageCount() - 1]; // Newest
      const idx = start + i + 1;
      const from = msg.getFrom().replace(/"/g, "").trim(); // Keep email address
      const count = thread.getMessageCount();
      
      const countStr = count > 1 ? ` (${count} msgs)` : ``;
      
      output += `\n${idx}. ${from}${countStr}\n   ${msg.getSubject()} (${formatDate(msg.getDate())})`;
      mapping[idx] = thread.getId();
    });

    PropertiesService.getScriptProperties().setProperty('CURRENT_LIST', JSON.stringify(mapping));
    send(output);

  } catch (e) { send(`Search Error: ${e.message}`); }
}

function getThreadIdFromState(index) {
  const json = PropertiesService.getScriptProperties().getProperty('CURRENT_LIST');
  if (!json) { send("Run -list first."); return null; }
  const id = JSON.parse(json)[index];
  if (!id) { send(`Index ${index} not found in last list.`); return null; }
  return id;
}

function formatDate(date) {
  const props = PropertiesService.getScriptProperties();
  const tz = props.getProperty('USER_TIMEZONE') || Session.getScriptTimeZone();
  return date.toLocaleDateString('en-US', { 
    timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
  });
}

function send(text) {
  if (!text) return;

  const props = PropertiesService.getScriptProperties();
  const mode = props.getProperty('SEND_MODE') || 'normal';
  const url = "https://api.groupme.com/v3/bots/post";

  if (mode === 'split') {
    const chunks = text.match(/.{1,150}(?:\s|$)/g) || [text];
    
    // Safety cap: Only send first 25 chunks
    const limit = Math.min(chunks.length, 25);
    
    for (let i = 0; i < limit; i++) {
      let chunk = chunks[i].trim() + ` [${i}/${limit}]`;
      if (!chunk) continue;
      
      if (i === limit - 1 && chunks.length > 25) {
        chunk += " ...(cut)";
      }

      UrlFetchApp.fetch(url, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ bot_id: BOT_ID, text: chunk })
      });
      Utilities.sleep(3000); 
    }
  } else {
    // Normal Mode: Cap at 3900 (Safety buffer below GroupMe's 4020 limit)
    if (text.length > 3920) text = text.slice(0, 3920) + "...(cut)";
    UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ bot_id: BOT_ID, text: text })
    });
  }
}

function sendHelp(arg) {
  if (arg && arg.toLowerCase() === "search") {
    send(
`Use '-search [query] [count]'.
Default count: 5 results. Add a number to change it (e.g., '-search is:unread 10').

Available options:
is:unread / is:read
from:amazon : from a name or address.
subject:delivery : emails with specific words in subject.
after:2024/01/01 : Emails received after a date (YYYY/MM/DD).
before:2024/01/01 : Emails received before a date.
older_than:2d : Emails older than a time period (d=day, m=month, y=year).
newer_than:2d : Emails newer than a time period.
has:attachment
filename:pdf : Emails with PDF attachments.
is:starred : Find starred/important emails.
in:spam / in:trash : Search specifically inside Spam or Trash.

You can combine multiple terms e.g. '-search is:unread has:attachment in:inbox 8'
`
);
    return;
}
  send(
`GMAIL BOT COMMANDS

-- LIST & READ --
-list (or 10, or 5-10)
-list spam (or trash, priority, sent, social, promotions, updates)
-list 5-10 spam
-search query [limit] (Ex: -search is:unread 10)
(send '-help search' for search options.)
-read : Latest inbox email
-read 1 : Latest msg in thread 1
-read 1 all : Full thread history
-read 1 details : Headers of all msgs
-read 1 3 : Specific msg #3

-- ACTIONS --
-reply 1; [msg] : reply to last msg in thread 1
-reply 1 3; [msg] : reply to msg #3
-delete 1
-move 1; [Folder]
-mark 1 read/unread

-- SETTINGS --
-mute / -unmute : Toggle auto-notifications
-silence [sender@email.com] : Block specific sender
-timezone [Region/City] : Set TZ (Ex: America/New_York)
-sendmode split : SMS friendly
-sendmode normal : Default
-check : Force check

check out https://github.com/flipphoneguy/email_sms for more info.
credits: flipphoneguy
`
  );
}
