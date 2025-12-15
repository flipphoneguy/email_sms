const bot_id = "PASTE_YOUR_BOT_ID_HERE"

function send(text) {
  const url = "https://api.groupme.com/v3/bots/post";
  if (text.length > 3950) {text = text.slice(0, 3950) + "\n\nmessage was too long so was shortened here."}
  const payload = {bot_id: bot_id,text: text,};
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    // This prevents the script from crashing on network errors.
    muteHttpExceptions: true 
  };
  const response = UrlFetchApp.fetch(url, options);
}

function listRecentEmails(count) {
  try {
    const threads = GmailApp.getInboxThreads(0, count);
    const allMessages = [];

    for (const thread of threads) {
      const messagesInThread = thread.getMessages();
      allMessages.push(...messagesInThread);
    }
    allMessages.sort((a, b) => b.getDate() - a.getDate());
    const recentMessages = allMessages.slice(0, count);
    const emails = recentMessages.map(message => ({
      sender: message.getFrom(),
      subject: message.getSubject(),
    }));
    return emails;
  } catch (e) {
    return `Failed to retrieve emails: ${e.message}`;
  }
}

function getEmailBody(howRecent) {
  try {
    const threads = GmailApp.getInboxThreads(0, howRecent + 5);
    const allMessages = [];
    for (const thread of threads) {
      allMessages.push(...thread.getMessages());
    }
    allMessages.sort((a, b) => b.getDate() - a.getDate());
    const messageIndex = howRecent - 1;
    if (messageIndex >= allMessages.length) {
      return `Error: Could not find an email at position ${howRecent}. Only found ${allMessages.length} total messages.`;
    }
    const targetMessage = allMessages[messageIndex];
    let body = targetMessage.getPlainBody();
    if (!body || body.trim() === "") {
      const htmlBody = targetMessage.getBody()
      const $ = Cheerio.load(htmlBody)
      body = $('body').text();
      body = "--- Parsed from HTML ---\n" + body;
    }
    return `From: ${targetMessage.getFrom()}\nSubject: ${targetMessage.getSubject()}\nDate: ${targetMessage.getDate()}\n\n\n\n${body}`;
  } catch (e) {
    return `Failed to get email body: ${e.message}`;
  }
}

function sendEmail(recipient, subject, body) {
  try {
    GmailApp.sendEmail(recipient, subject, body);
    return { status: 'success' };
  } catch (e) {
    return { 
      status: 'failed', 
      reason: `Could not send email. Google reported the following error: ${e.message}` 
    };
  }
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  if (payload.sender_type === "bot") {
    return; // Stop processing
  }
  const text = payload.text;
  const userId = payload.user_id;
  if (text === "-help") {
    send("send '-list {number}' to list number amount of recent emails.\nsend '-read {number}' to read the number to latest email.\nsend '-send; to; subject; body' to send an email. rmember the semicolans.")
  } else if (text.startsWith("-list") || text.startsWith("-recent")) {
    let emails;
    try {emails = listRecentEmails(parseInt(text.split(" ")[1]) || 5);}
    catch (e) {send(e.message); return}
    if (Array.isArray(emails)) {
      const emailList = emails.map((e, index) => `${index + 1}. ${e.subject}\n  From: ${e.sender}`).join('\n\n');
      send(emailList);
    } else {
      send(emails); // Send the error message if it failed
    }
  } else if (text.startsWith("-read")) {
    try {send(getEmailBody(parseInt(text.split(" ")[1]) || 1))}
    catch (e) {send(e)}
  } else if (text.startsWith("-send")) {
    if (text.split(";").length < 4) {send('invalid input. send -help for help.')}
    else {
      const result = sendEmail(text.split(";")[1].trim(), text.split(";")[2].trim(), text.split(";")[3].trim())
      if (result.status === 'success') {
        send("✅ Email sent successfully");
      } else {
        send(`❌ Error sending email: ${result.reason}`);
      }
    }
  }
}
