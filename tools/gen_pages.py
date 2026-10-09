import html
BASE='https://jmedley18.github.io/injury-reports/'
EFF='October 9, 2026'
NAV=[('index.html','Open the app'),('about.html','About'),('privacy.html','Privacy Policy'),('terms.html','Terms of Use'),('contact.html','Contact')]
def page(fn,title,desc,body):
    nav=' '.join(f'<a href="{h}"{" aria-current=\"page\"" if h==fn else ""}>{t}</a>' for h,t in NAV)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)} · Injury Reports</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{BASE}{fn}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Injury Reports">
<meta property="og:title" content="{html.escape(title)} · Injury Reports">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{BASE}{fn}">
<meta property="og:image" content="{BASE}icon-512.png">
<meta name="theme-color" content="#050b1f">
<link rel="icon" type="image/png" sizes="32x32" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.json">
<link rel="stylesheet" href="pages.css">
</head>
<body>
<div class="wrap">
<header><a href="./"><img src="icon-192.png" alt="Injury Reports icon"><b>Injury Reports</b></a><a class="open" href="./">Open app →</a></header>
<main class="card">
{body}
</main>
<nav class="pages" aria-label="Site pages">{nav}</nav>
<p class="copy">© 2026 Injury Reports · Not affiliated with ESPN, the NFL, MLB or the NBA.</p>
</div>
</body>
</html>
'''
pages={}
pages['about.html']=('About','About Injury Reports: a free phone web app with live NFL, MLB and NBA injury reports, scores, fantasy player tracking and injury alerts.',f'''
<h1>About Injury Reports</h1>
<p>Injury Reports is a free, phone-friendly web app that shows the latest injury reports for every NFL, MLB and NBA team in one place. It installs to your home screen like a regular app, with no app store needed.</p>
<h2>What you can do</h2>
<ul>
<li><b>Team injury reports:</b> pick a league and any team to see who is Out, Doubtful, Questionable, Day-to-Day or on the Injured List, with the injury, an estimated return date when available, a short note and when the report was last updated.</li>
<li><b>My Players:</b> build fantasy watch lists by searching players, pasting a list of names, or importing a roster from a Sleeper fantasy league. Injured players are listed first.</li>
<li><b>Alerts:</b> star teams and follow players to get a "What's new" summary when a status changes. You can also turn on push notifications that arrive even when the app is closed.</li>
<li><b>Scores:</b> live scores, today's finals and the next week of games, with start times, where to watch (TV, streaming and local channels), records and betting lines when available.</li>
</ul>
<h2>Where the data comes from</h2>
<p>Injury reports, player search and scores come from ESPN's publicly available sports data feeds and are loaded live when you open or refresh the app. Fantasy roster imports use Sleeper's public API. Statuses are shown as published by those sources and can lag behind official team announcements.</p>
<h2>Independence</h2>
<p>Injury Reports is an independent project. It is <b>not affiliated with, endorsed by or sponsored by</b> ESPN, the NFL, MLB, the NBA, any team, Sleeper or any sportsbook. Team names and logos belong to their respective owners and are shown only to identify teams.</p>
<h2>Advertising</h2>
<p>The app is free and supported by advertising, which may include Google AdSense ads and sportsbook referral links. Sportsbook links are for adults 21+ in eligible states. See our <a href="privacy.html">Privacy Policy</a> and <a href="terms.html">Terms of Use</a>.</p>
<h2>Contact</h2>
<p>Questions or feedback? See the <a href="contact.html">Contact page</a>.</p>
''')
pages['privacy.html']=('Privacy Policy','Privacy Policy for the Injury Reports app: what is stored on your device, push alert data, advertising cookies including Google AdSense, and referral links.',f'''
<h1>Privacy Policy</h1>
<p class="eff">Effective date: {EFF}</p>
<p>This policy explains what information the Injury Reports web app ("the app", "we") uses and stores. The short version: there are no accounts, we don't ask for your name or email to use the app, and most of your data never leaves your device.</p>
<h2>Information stored on your device</h2>
<p>The app saves your settings in your browser's local storage on your own device. This includes your starred teams, your My Players lists, your last-viewed tab, the last injury statuses you've seen (used for "What's new"), cached copies of the latest reports for offline use, a cached copy of Sleeper's public player list, and the Sleeper username you enter, if any. We can't see this data. You can delete it any time by clearing this site's data in your browser settings.</p>
<h2>Push notifications</h2>
<p>Push alerts are optional and off until you turn them on. When you enable them, your browser creates a push subscription (an anonymous endpoint address and encryption keys issued by your browser's push service, such as Google, Apple or Mozilla). We store that subscription together with the list of teams and players you follow on our notification server, which runs on Cloudflare Workers. We use it only to send you injury alerts. It isn't linked to your name, email or any account. Turning alerts off in the app deletes your subscription from our server. You can also block notifications in your browser or phone settings.</p>
<h2>Third-party data sources</h2>
<p>To show reports and scores, your device requests data directly from ESPN's public sports feeds and loads team logos and player photos from ESPN's image servers. If you use the Sleeper import, your device requests public data from Sleeper's API using the username you enter. These providers receive standard request information (such as your IP address and browser type) under their own privacy policies.</p>
<h2>Advertising and cookies</h2>
<p>The app is supported by advertising.</p>
<ul>
<li><b>Google AdSense.</b> We may use Google AdSense to show ads. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" rel="noopener">Google Ads Settings</a>. Learn more about how Google uses information at <a href="https://policies.google.com/technologies/ads" rel="noopener">policies.google.com/technologies/ads</a>. Where required by law (for example in the EEA, UK and Switzerland), you'll be asked for consent before personalized ads or cookies are used. You can also opt out of some third-party vendors' use of cookies for personalized advertising at <a href="https://www.aboutads.info/choices/" rel="noopener">aboutads.info</a>.</li>
<li><b>Sportsbook referral links.</b> The app shows referral links for sportsbooks (Fanatics Sportsbook, DraftKings Sportsbook and FanDuel Sportsbook). The app's operator may receive a referral benefit if you sign up through these links. Clicking a link takes you to that company's website or app, where its own privacy policy and terms apply. We don't share your information with these companies. The link itself identifies the referrer.</li>
</ul>
<h2>Analytics</h2>
<p>We don't use analytics or tracking scripts beyond the advertising described above.</p>
<h2>Hosting</h2>
<p>The app is hosted on GitHub Pages. GitHub may collect standard technical information (such as IP addresses) in server logs for security and operations, under GitHub's privacy statement.</p>
<h2>Children</h2>
<p>The app isn't directed to children under 13, and we don't knowingly collect personal information from children. Sportsbook links are intended only for adults 21 and older.</p>
<h2>Changes</h2>
<p>We may update this policy. Changes take effect when posted on this page, and we'll update the effective date above.</p>
<h2>Contact</h2>
<p>Questions about privacy? Email <a href="mailto:joemedley@yahoo.com">joemedley@yahoo.com</a>.</p>
''')
pages['terms.html']=('Terms of Use','Terms of Use for the Injury Reports app: informational use only, no guarantee of accuracy, third-party links, and 21+ requirement for sportsbook links.',f'''
<h1>Terms of Use</h1>
<p class="eff">Effective date: {EFF}</p>
<p>By using the Injury Reports web app ("the app"), you agree to these terms. If you don't agree, please don't use the app.</p>
<h2>Informational use only</h2>
<p>The app provides sports injury reports, scores and related information for general informational and entertainment purposes. It isn't medical, betting, financial or professional advice.</p>
<h2>No guarantee of accuracy</h2>
<p>Information comes from third-party public sources (mainly ESPN's public feeds and Sleeper's public API) and is shown as received. It may be incomplete, delayed or wrong, and it can change at any time. We make no guarantees about the accuracy, completeness, timeliness or availability of any information, alerts or notifications. Push alerts may be delayed or fail to arrive. Always confirm important information with official team and league sources.</p>
<h2>Gambling and sportsbook links</h2>
<p>The app may show advertisements and referral links for sportsbooks. These are only for people <b>21 or older who are physically located in a state where sports betting is legal</b> and where the operator is licensed. Eligibility and offer terms are set by each operator. Nothing in the app is a recommendation to place a bet. Please gamble responsibly. If you or someone you know has a gambling problem, call <b>1-800-GAMBLER</b>.</p>
<h2>Third-party sites and ads</h2>
<p>The app links to and displays content and ads from third parties (including ESPN, Sleeper, Google and sportsbooks). We don't control and aren't responsible for third-party sites, services, ads or offers, and your use of them is governed by their own terms and policies.</p>
<h2>Trademarks</h2>
<p>Team, league and company names and logos are the property of their respective owners and are used only to identify them. The app isn't affiliated with or endorsed by ESPN, the NFL, MLB, the NBA, any team, Sleeper or any sportsbook.</p>
<h2>Acceptable use</h2>
<p>Don't misuse the app, interfere with its operation, or try to access its services in ways other than through the provided interface.</p>
<h2>Disclaimer and limitation of liability</h2>
<p>The app is provided "as is" and "as available," without warranties of any kind, express or implied. To the fullest extent permitted by law, the app's operator isn't liable for any loss or damage arising from your use of the app or reliance on its information, including any betting or fantasy decisions.</p>
<h2>Changes</h2>
<p>We may change these terms or the app at any time. Continued use after changes means you accept the updated terms.</p>
<h2>Contact</h2>
<p>Questions? Email <a href="mailto:joemedley@yahoo.com">joemedley@yahoo.com</a>.</p>
''')
pages['contact.html']=('Contact','Contact the Injury Reports app: questions, feedback, data corrections and privacy requests.',f'''
<h1>Contact</h1>
<p>Questions, feedback, a data problem or a feature idea? We'd love to hear from you.</p>
<p style="font-size:18px;margin:16px 0">📧 <a href="mailto:joemedley@yahoo.com">joemedley@yahoo.com</a></p>
<h2>Helpful details to include</h2>
<ul>
<li>The league and team (and player, if it's about a specific report)</li>
<li>Your phone and browser (for example, iPhone Safari or Android Chrome)</li>
<li>What you expected to see and what you saw instead</li>
</ul>
<p class="fine">Injury statuses come from ESPN's public feeds and are shown as published. If a status looks out of date, the official team or league report is the best source. Injury Reports isn't affiliated with ESPN, the NFL, MLB or the NBA. For privacy questions, see the <a href="privacy.html">Privacy Policy</a>.</p>
''')
for fn,(t,d,b) in pages.items():
    open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..',fn),'w').write(page(fn,t,d,b))
print('ok')
