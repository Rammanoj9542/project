import React, { useState, useEffect, useRef } from 'react';
import configData from '../constants/config.json';
import '../App.css';
import { Menu, MenuItem, MenuButton } from "@szhsin/react-menu";

// Functional component for rendering a header section
export default function AdminHeader({
    heading, // Main heading text
}) {
    const logoStyle = { position: 'absolute', top: 0, left: 0, width: '250px', height: '110px' };
    const menuStyle = { position: 'absolute', top: 0, right: 0, textAlign: 'right', color: 'grey', marginTop: '15px', marginRight: '40px' };
    const menuLine = { width: '30px', height: '5px', backgroundColor: '#9434ec', margin: '6px 0', transition: 'transform 0.3s ease' };
    const textClassName = "font-medium text-purple-600 hover:text-purple-500 text-center text-sm";

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef();

    // Handle User Account button
    const handleAdminHomeButton = () => {
        window.location.href = '/adminhome';
    };

    // Handle user logout
    const handleLogout = () => {
        fetch('/logout', {
            method: 'GET',
            credentials: 'same-origin', // Include this if you need to send cookies
        })
            .then(response => {
                if (response.status === 200) {
                    // Redirect to the root URL after successful logout
                    window.location.href = '/';
                } else {
                    // Handle the case where logout was not successful (e.g., display an error message)
                    console.error('Logout failed');
                }
            })
            .catch(error => {
                console.error('An error occurred during logout:', error);
            });
    };

    const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
            setIsMenuOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="mb-10">
            <div className="flex justify-center" style={logoStyle}>
                <img src={configData.LogoSource} alt={configData.LogoAlt} border="0" width={configData.LogoWidth} />
            </div>

            <h2 className="text-center text-3xl font-extrabold text-gray-900">
                {heading}
            </h2>

            <div ref={menuRef} style={menuStyle} onClick={() => setIsMenuOpen(!isMenuOpen)} id="menu">
                <Menu menuButton={<MenuButton className={textClassName}>
                    <div style={{ ...menuLine, transform: isMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></div>
                    <div style={{ ...menuLine, opacity: isMenuOpen ? 0 : 1 }}></div>
                    <div style={{ ...menuLine, transform: isMenuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }}></div>
                </MenuButton>}>
                    <MenuItem onClick={handleAdminHomeButton} className={textClassName}>Admin Home</MenuItem>
                    <MenuItem onClick={handleLogout} className={textClassName}>Logout</MenuItem>
                </Menu>
            </div>
        </div>
    );
}