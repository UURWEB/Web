U.U.R. MODERN WEB DIRECTORY
=============================

WHAT THIS IS
------------
A modern public directory for all U.U.R. websites, plus a private webmaster dashboard.

PUBLIC FEATURES
---------------
- Modern responsive design
- Search
- Category filters
- Status filters
- Sorting
- Grid/list view
- Featured websites
- Visitor favorites saved on their device
- Dark mode
- Network status panel
- CST clock
- Date displayed exactly 100 years behind the modern date
- Mobile-friendly design
- Network map grouped by category

ADMIN FEATURES
--------------
- Firebase email/password login
- Add websites
- Edit websites
- Delete websites
- Feature websites
- Choose category, status, order, tags, description, button label, and logo URL
- Live card preview
- Search existing records
- Export JSON backup
- Import JSON backup

WHY FIREBASE IS NEEDED
----------------------
GitHub Pages is static. Without a shared database, a new site added in the admin page would only exist on your own browser.

Firebase allows:
- You to sign in privately
- Public visitors to see the same links
- Updates to appear without rebuilding the website

The public Firebase configuration is not a secret. The included Firestore rules are what prevent other users from changing the directory.

FIREBASE SETUP
--------------
1. Go to Firebase Console and create a project.

2. Open:
   Build > Firestore Database
   Create a database.

3. Open:
   Build > Authentication > Sign-in method
   Enable Email/Password.

4. In Authentication > Users:
   Add your administrator email and password.

5. Click the administrator account and copy its UID.

6. Open firestore.rules in this folder.
   Replace:
   PASTE_YOUR_FIREBASE_UID_HERE
   with your exact UID.

7. In Firestore > Rules:
   Paste the contents of firestore.rules and publish.

8. Open:
   Project settings > General > Your apps
   Create a Web App if needed.

9. Copy the Firebase configuration into firebase-config.js.

10. Upload the entire website to GitHub.

GITHUB PAGES
------------
1. Create a public GitHub repository, for example:
   uur-web-directory

2. Upload:
   index.html
   admin.html
   firebase-config.js
   firestore.rules
   assets folder
   README.txt

3. Open:
   Settings > Pages

4. Choose:
   Deploy from a branch
   main
   / (root)

5. The public site will be:
   https://YOUR-USERNAME.github.io/uur-web-directory/

6. The administrator page will be:
   https://YOUR-USERNAME.github.io/uur-web-directory/admin.html

FIRST DATABASE RECORDS
----------------------
Until Firebase is connected, the website displays built-in preview cards.

After Firebase is connected, use admin.html to add your real links. You can also use the provided sample-sites.json as a reference.

IMPORTANT
---------
Do not put your administrator password in the website files.
Create the account through Firebase Authentication.

The Firestore rules allow everyone to read the directory but only the Firebase account with your exact UID to change it.
