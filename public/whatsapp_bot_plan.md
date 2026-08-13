# FixMaadi: WhatsApp Chatbot MVP Plan

You are absolutely right. In Tier 2 and Tier 3 cities like Bagalkot, forcing users to download an app or navigate a website adds too much friction. WhatsApp is the native internet for India. A WhatsApp-first approach is brilliant.

Since you and Bhuvan are non-technical, I will build an automated WhatsApp bot that runs entirely on your laptop. You won't need to pay for expensive APIs right now. We will use a library that lets you just scan a QR code on your screen to turn your WhatsApp number into an automated bot.

## Proposed Architecture (Zero Cost)

*   **Technology**: Node.js and the `whatsapp-web.js` library.
*   **How it works**: When I start the program, it will show a QR code on your screen. You scan it with the WhatsApp app on your phone (just like WhatsApp Web). Once scanned, your phone number becomes the FixMaadi automated bot!
*   **Safety**: This is perfect for a pilot, but later when we scale to thousands of users, we will migrate to the official WhatsApp Business API to avoid bans. For the Bagalkot pilot of 100-200 customers, this is the best, free way to start.

## The Chat Flow (Kannada + English)

1.  **Welcome Message**: 
    *   *Customer sends*: "Hi"
    *   *Bot replies*: "Namaskara! 🙏 Welcome to FixMaadi Bagalkot. We provide trusted local professionals. Reply with the number for what you need:
        1. Purohit & Pujas
        2. Mixie / Appliance Repair
        3. Plumber
        4. Electrician
        5. Beautician"
2.  **Service Selection**:
    *   *Customer sends*: "3"
    *   *Bot replies*: "Great, you need a Plumber. 💧 Please reply with your Area (e.g., Navanagar Sector 4) and preferred time."
3.  **Confirmation**:
    *   *Customer sends*: "Navanagar Sector 4, tomorrow morning."
    *   *Bot replies*: "✅ Booking received! Bhuvan is assigning a trusted local professional to you. We will call you in 10 minutes to confirm."

## User Review Required

> [!WARNING]
> This requires abandoning the React website we just built and creating a completely new Node.js backend project. 

## Open Questions

> [!IMPORTANT]
> 1. **Do you approve this chat flow?** Is there anything you'd like to change about how the bot talks to the customer?
> 2. **Are you okay with running this bot script from your laptop terminal** to test it out before we put it on a cloud server? I will write simple instructions on how to start it.

Once you approve, I will write the complete Node.js code for the bot!
