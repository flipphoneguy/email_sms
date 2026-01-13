# Gmail-to-SMS GroupMe Bridge

This tool connects your Gmail account to a private GroupMe chat. It functions as a secure bridge, allowing you to read, search, and reply to emails entirely via text message (SMS).

## Features

* **Real-time Notifications:** Receive new email alerts instantly.
* **Full Two-Way Communication:** Reply to, forward, and delete emails directly from the chat.
* **Smart Listing:** View your inbox, spam, or specific folders with support for page ranges.
* **Thread Awareness:** Automatically detects conversation threads, ensuring you never miss context in a long email chain.
* **Privacy:** All data is processed within your own Google account. No third-party servers are used.

## Setup Guide

### Step 1: Create the GroupMe Bot
1.  Log in to [dev.groupme.com](https://dev.groupme.com).
2.  Click **Bots** > **Create Bot**.
3.  Select the specific group where you want to send/receive emails.
4.  Copy the **Bot ID**. You will need this in the next step.

### Step 2: Install the Script
1.  Go to [script.google.com](https://script.google.com) and click **New Project**.
2.  Delete any existing code and paste the script provided to you.
3.  **Bot ID:** At the very top of the script, paste your Bot ID where it says `PASTE_YOUR_BOT_ID_HERE`.
4.  **Add Helper Library:**
    * On the left sidebar, click the **+** next to **Libraries**.
    * Paste this Script ID: `1ReeQ6WO8kKNxoaA_O0XEQ589cIrRvEBA9qcWpNqdOP17i47u6N9M5Xh0`
    * Click **Look up**, then click **Add**.

### Step 3: Connect and Deploy
1.  Click **Deploy** (top right) > **New deployment**.
2.  Click the **Gear Icon** > **Web app**.
3.  Set **Who has access** to **Anyone**. (This is required for GroupMe to communicate with your script).
4.  Click **Deploy**.
5.  **Authorize Access:**
    * Sign in to your Google account.
    * Click **Advanced** at the bottom.
    * Click **Go to Untitled Project (unsafe)** at the very bottom.
    * Click **Allow**.
6.  Copy the **Web App URL**.
7.  Return to [dev.groupme.com](https://dev.groupme.com), edit your bot, and paste this URL into the **Callback URL** field. Save.

### Step 4: Enable Auto-Notifications
To receive emails automatically, you must set a timer:
1.  In the script editor, click the **Clock Icon (Triggers)** on the left.
2.  Click **+ Add Trigger**.
3.  Set the following:
    * Function: `checkForNewEmails`
    * Event source: `Time-driven`
    * Type: `Minutes timer`
    * Interval: `Every minute`
4.  Click **Save**.

## Usage Guide

### 1. Reading & Listing Emails
| Command | Result |
| :--- | :--- |
| `-list` | Lists the 5 most recent threads in your Inbox. |
| `-list 10` | Lists the 10 most recent threads. |
| `-list 5-10` | Lists threads from #5 to #10. |
| `-list [folder]` | Lists threads in a specific folder/category. <br> **Available:** `spam`, `trash`, `sent`, `priority`, `social`, `promotions`, `updates`. |
| `-list [folder] [range]` | Lists range within a folder. <br> **Example:** `-list spam 5-10` |
| `-read` | Reads the **latest** email in your Inbox (useful after a notification). |
| `-read 1` | Reads the latest message in thread #1. |
| `-read 1 all` | Fetches the full history of thread #1. |
| `-read 1 details` | Shows sender/date info for all messages in thread #1 (no body text). |
| `-read 1 3` | Reads specifically message #3 in thread #1. |

### 2. Actions (Replying, Moving, Deleting)
| Command | Result |
| :--- | :--- |
| `-reply 1; [msg]` | Reply to thread #1 (replies to the latest message). |
| `-reply 1 3; [msg]` | Reply specifically to the 3rd message in thread #1. |
| `-delete 1` | Moves thread #1 to Trash. |
| `-move 1; [Folder]` | Moves thread #1 to a specific folder/label. |
| `-mark 1 read` | Marks thread #1 as Read. |
| `-send; to; sub; body` | Sends a brand new email. |

### 3. Search Reference
Use `-search [query] [count]` to find specific emails.
* **Default count:** 5 results. Add a number to change it (e.g., `-search is:unread 10`).

| Query | Description |
| :--- | :--- |
| `is:unread` / `is:read` | Find emails based on status. |
| `from:amazon` | Find emails from a name or address. |
| `subject:delivery` | Find emails with specific words in the subject. |
| `after:2024/01/01` | Emails received **after** a date (YYYY/MM/DD). |
| `before:2024/01/01` | Emails received **before** a date. |
| `older_than:2d` | Emails older than a time period (d=day, m=month, y=year). |
| `newer_than:2d` | Emails newer than a time period. |
| `has:attachment` | Emails containing files. |
| `filename:pdf` | Emails with PDF attachments. |
| `is:starred` | Find starred/important emails. |
| `in:spam` / `in:trash` | Search specifically inside Spam or Trash. |

### 4. Settings & Configuration
| Command | Result |
| :--- | :--- |
| `-mute` | Pauses automatic email notifications globally. |
| `-unmute` | Resumes automatic email notifications. |
| `-silence [email]` | Blocks notifications from a specific email address permanently. |
| `-timezone [Zone]` | Sets your timezone (e.g., `-timezone America/New_York`). |
| `-sendmode split` | Splits long emails into 150-char chunks (Best for SMS users). |
| `-sendmode normal` | Sends emails as one large message (Best for App users). |

## Understanding "Threads"
Gmail groups emails into conversations called **Threads**.
* If you see a list item like `1. Josh (5 msgs)`, it means there are 5 emails in that conversation.
* `-read 1` will show you the most recent reply from Josh.
* `-read 1 all` will show you the entire conversation history.

**Credits:** @flipphoneguy