# FAQ

**Does Bantu OS send my files to the AI?**
Only what you or NasTech put in a conversation. NasTech reads a file when a task needs it, through
tools you can see in the chat and in the audit log. "Pick up where you left off" sends names and
dates (file names, project branches, chat titles), never contents, and only after you turn it on.

**Which AI model does it use?**
Whatever your NasTech is set up with: a NasTech Portal subscription, or an API key for OpenRouter,
OpenAI, Anthropic, a local model and others. Change it in Settings > NasTech & agents or with
`nastech model`.

**What does it cost?**
Bantu OS is free and open source. The model is billed by its provider; Settings > Usage shows how
much NasTech has used this week and this month, and what is left on a NasTech Portal plan.

**Can it break my computer?**
Anything that changes something asks first; moving files to the Trash and stopping programs ask
every time, and Bantu OS never deletes permanently. Keep backups of anything you let an agent touch,
as with any software that acts on your behalf.

**Do I have to use voice?**
No. Everything works from the keyboard, and the microphone is never opened unless voice is on.

**Can I use my own themes, keyboard shortcuts and scripts?**
Yes: see [Make it yours](make-it-yours.md).

**How is this different from Omarchy?**
Omarchy makes Linux something your coding agent can fix and reshape. Bantu OS makes the agent how
you use the computer, for everyone, and it asks before it changes anything. It also runs on the Mac
you already have, and Bantu OS can run as an app on Arch Linux and Omarchy.

**How do I update?**
On a Mac, `git pull` and `npm run bootstrap` in your checkout; NasTech updates itself with
`nastech update`. On Bantu OS Linux, the menu's Update, or `bantu-os update`.
