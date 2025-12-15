#send and read emails using sms


after following this guide you’ll be able to:

* list your emails
* read full emails including HTML emails that aren’t plain text, and
* send emails

this is fully free to set up. we will be using Google Apps Script and GroupMe to set it up. this will also give you some knowledge on how to use GAS and how to create a GroupMe bot.

instructions:

how to create a groupme bot for our script to interact with:

* head over to web.groupme.com and set up an account if you haven’t already and ensure SMS mode is enabled.
* create a new group.
* head to dev.groupme.com, login, click bots on the top.
* click create new bot and add it to the group you just created.
* copy the bot id and save it somewhere. we’ll need it soon.

that’s it for this part! now we need to host our actual bot which will do the magic:

* head over to script.google.com and sign in on the same account as where you want to connect your email and click new project
* in the editor delete everything there and replace with the content of this script.
* now paste the bot id on the top line between the ““ where it says PASTE_YOUR_BOT_ID_HERE and save the file by clicking the save icon.
* on the left sidebar of the page by click + near ‘libraries’ and paste `1ReeQ6WO8kKNxoaA_O0XEQ589cIrRvEBA9qcWpNqdOP17i47u6N9M5Xh0` in the script id field
* click Look up and then add.
* now click deploy > new deployment and click the settings icon on the left near ‘select type’ and select web app.
* switch who has access to Anyone and click deploy.
* click authorize access, sign in to the same google account and click advanced in the bottom.
* click on the very bottom on ‘Go to Untitled project (unsafe)’ and click allow.
* click copy to copy the url of the web app. you’ll need this in the next step.
* head back to dev.groupme.com and click to edit the bot you just created and paste the url you just copied in the callback url field and click save.

that’s it!! your bot should be working perfectly!

usage:
send “-list NUMBER” to the new group to see a list of your recent emails (e.g. -list 2 will show the headers of your 2 latest emails) (“-list” plain lists the 5 most recent messages.)

“-read NUMBER” sends back the full content of the NUMBER to last email (-read plain sends the last email)

“-send; example@example.com; this is the subject; this is the body“ sends an email.

[details="notes"]
the library you added is for parsing HTML to plain text so you can read emails from companies etc.

[/details]


##credits: flipphoneguy