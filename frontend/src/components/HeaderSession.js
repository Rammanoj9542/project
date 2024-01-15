import configData from '../constants/config.json';
import '../App.css';

// Functional component for rendering a header section
export default function UserHeader({
    heading, // Main heading text
}) {
    const logoStyle = { position: 'absolute', top: 0, left: 0, width: '250px', height: '110px' };
    const menuStyle = { position: 'absolute', top: 0, right: 0, textAlign: 'right', color: 'grey', marginTop: '15px', marginRight: '40px' };
    const menuLine = { width: '30px', height: '5px', backgroundColor: '#9434ec', margin: '6px 0', transition: 'transform 0.3s ease' };

    return (
        <div className="mb-10">
            <div className="flex justify-center" style={logoStyle}>
                <img src={configData.LogoSource} alt={configData.LogoAlt} border="0" width={configData.LogoWidth} />
            </div>

            <h2 className="text-center text-3xl font-extrabold text-gray-900">
                {heading}
            </h2>

            <div style={menuStyle}>
                <div style={menuLine}></div>
                <div style={menuLine}></div>
                <div style={menuLine}></div>
            </div>
        </div>
    );
}