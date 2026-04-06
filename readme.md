Timely Scholar – A Simple AI-Ready Attendance Tracker for Students.
   
🚀 Overview      
     
College students often struggle to track class attendance accurately and end up getting short on the minimum attendance requirement.   
Timely Scholar solves this problem by allowing students to :-     
   
✔ Sign in securely with Google     
✔ Add their subjects  
✔ Track progress visually with attendance status coming soon   
  
This project was built during Google’s Build & Blog Marathon 2025. 
      
Live App: https://timely-scholar.web.app          
    
Source Code:  https://github.com/sAitama2025-02/timely-scholar  

🔐 Authentication + Personal Data

Timely Scholar uses Firebase Authentication with Google sign-in. 
Every user gets a personalized dashboard where subjects added are stored just for them.
 
📝 Current Working Features   
Feature	Status    
Google Login	✅ Working
Add Subjects	✅ Working
Save to Firestore	⚠️ Partial (works after refresh)
Present / Absent Updates	🚧 In Progress
Remove Subjects	🚧 In Progress 
AI Suggestion	🚧 Planned 

Users can add multiple subjects with no technical knowledge required.

🧱 Architecture Used
Area	Technology
Frontend	Next.js + TypeScript
Hosting	Firebase Hosting
Authentication	Firebase Auth
Database	Cloud Firestore (documents per user)
🔮 What’s Coming Next

Here’s what will be added soon:

✨ Attendance marking: Present / Absent buttons
✨ Remove subjects
✨ Show attendance % dynamically
✨ Backend service using Cloud Run
✨ AI study suggestions using Gemini Flash
✨ OCR feature to upload timetable images
✨ Weekly view for better planning

Basically, the foundation is ready — now features will grow on top.

🧠 Learnings

Working with Firebase Authentication and Firestore

Deploying a Next.js application on Firebase Hosting

Practical experience with building a real product under deadline pressure

🏁 Conclusion

Timely Scholar is a simple but useful tool that lays the groundwork for a complete student productivity assistant. With AI enhancements planned, students will soon get automated attendance monitoring and personalized study plans.

🔗 Live App: https://timely-scholar.web.app

🔗 Source Code: https://github.com/sAitama2025-02/timely-scholar
