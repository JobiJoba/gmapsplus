# GMAPSPLUS

## IDEA

Google maps is fantastic and GMapsPlus is here to extend this fantastic tool!

Adding your favorite place from Google Maps into GMapsPlus will let you filter your data even more! You want a burger restaurant with parking? EASY in GMapsPlus ... impossible in Google Maps.

![Google Maps filters screenshot](ingmaps1.jpg)

In GMapsPlus

![GMapsPlus filters screenshot](ingmaps2.jpg)

### Solve the biggest problem in Chiang Mai

You don't know what to eat tonight? Add your favorite restaurant to the spin and randomly get a suggestion!

![cmPro](cmProblem.jpg)


### Social aspect! Create list and share them

Create public list of your favorite burger restaurant or best bubble tea in town. 



## TECHNICAL

## Core Stack

- **React** - Frontend framework
- **Vite** - Build tool and dev server
- **Convex** - Backend (actions, functions, database, auth)

## UI & Styling

- **Tailwind CSS v4** - Utility-first CSS framework
- **SHADCN UI** - Component library built on Radix UI + Tailwind

## Maps Integration

- **@vis.gl/react-google-maps** - React wrapper for Google Maps
  - Documentation: https://visgl.github.io/react-google-maps/
  - Install: `npm install @vis.gl/react-google-maps`

### HOWTO RUN PROJECT

To run the project, use `npm run dev`

In convex environment variable, add a GOOGLE_PLACES_API_KEY
In your google cloud console activate the google maps for javascript

in your .env.local add the two following keys

VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID (keep it as DEMO MAP ID)

### HOW Cursor was used

Cursor did all the code (No single line has been changed by me - only prompting)
Only used composer-1.

I've done some Sketch with Figma.

I first created a default convex project (NPM CONVEX CREATE)

The first prompt was using Agent mode and telling him my stack.

The second prompt was more a big prompt with the general idea, and some mockup executed in plan mode. I was happily surprised by the questions asked.

After that it was fine tuning and bug debugging in agent mode.

Once I had a stable solution, I start to add more features.
