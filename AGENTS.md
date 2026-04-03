Run tests and static analysis tools on every code change, but not when only comments or documentation are changed.

Always adapt the documentation for the agents' best understanding. When a new agent is used to develop or the agent loses its context, they must be able to catch up through the documentation.

Always fetch, sync, and pull the main branch before starting to read the code (or create your branch from the main). If necessary, stash modifications before, then pop and apply after.

Update the language translation file (i18n.js), as needed, including placeholders, help text, and everything on the screen.

Project context:
#church-finder
Web  & app to help connect young people to the community of believers around Montreal and region.
#Terminology
When I'm talking about churches, gathering hosts, events organizers, I'm referring to a HOST, whereas the users will see the alias CHURCH(ES).
When I'm talking about a common user, I'm talking about the person who accesses the website (or the app) to find a church or event.
When I'm talking about ADMs, they are 3 people: Me (developer), the founder of Youth Montreal, and his CO founder only.
When I'm talking about events, gatherings, church service, small group, outtings, fellowship, evangelisation, etc, I'm referring to an EVENT, whereas the users will see any of those aliases according to their context.
When I'm talking about suggestions, suggest an update, suggestion modification, report an error, etc, I'm referring to a REPORT, whereas the users will see the other aliases according to their context.
When I'm talking about Host Request, become a host, host solicitation, etc, I'm referring to a TITLE REQUEST, whereas the users may see these aliases according to their context
#Requisites
I need a website alongside its mobile app (for Android and IOS) where the first and main page (landing) is like a single page app, where each section fills the whole screen size of the device being used.
The first section is the About Us, where they can read the reason why we exist.
The second section is the church finder, where they can switch between 2 different views. Users can look for events or for hosts. The user's current GPS position is read to set as a default filter with a maximum range distance from that address. The map will show the user's current position as a black pin on the map. The map view will show the hosts according to the filters. Whenever an user selects a host, they'll see the selected pin in red. And whenever it is an ADM viewing the map, they'll also see a pin in red referring the host they're modifying. That is, everytime there's a pin on the map in context, it should be red, then after the focus leaves it, it gets its original color back. The calendar view shows the events happening. The calendar view has 3 exhibition options. The daily option will show the events happening today, according to the filters, but the user can also navigate (previous, today, next) to other days (obviously, the day they're visualizing must be visible in the interface). The weekly view is similar, except that it shows all the events of the week grouped by days (with the same navigation for previous, current, and next weeks. The monthly view has a agenda style layout where all the days of the month is shown with little references to events within the squares that represent days in the agenda (containing event title and host name).
The third section is visible only for hosts and admins. This section is where they can review change title requests submitted, and either accept them, modify and apply them, or refuse them. Hosts can only see reports concerning their own organization or their events. ADMs can see all the reports and the title requests separately (with filters).
The fourth section is only visible to ADMs. This is where the Hardening Tools are located as well as the Audit log.
The fifth section is the Contact us section, where users can send an email to the admins. There's also a button here to apply to become a host.