import React from 'react';
import './NonTeachingDashboard.css';
import Navbar from './Navbar';

const NonTeachingDashboard = () => {
  return (
    <div className="non-teaching-dashboard">
      <Navbar />

      <div className="header-container">
        <div className="wrapper">
          <header>
            <div className="hero-content">
              <h1>Welcome,</h1>
              {/* <h2>  Diksha Sharma</h2> */}
              <a href="hostel.html">Hostel</a>
              <a href="mess.html">Mess</a>
              <a href="library.html">Library</a>
              {/* Add more links as needed */}
            </div>
            <div className="photo-bg"></div>
          </header>
        </div>
      </div>
    </div>
  );
};

export default NonTeachingDashboard;
