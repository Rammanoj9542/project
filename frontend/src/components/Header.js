import { Link } from 'react-router-dom'; // Import the Link component from 'react-router-dom' for routing
import configData from '../constants/config.json'; // Import configuration data from 'config.json'
import '../App.css'; // Import the CSS styles from 'App.css'

// Functional component for rendering a header section
export default function Header({
    heading,     // Main heading text
    paragraph,   // Paragraph text
    linkName,    // Name of the link
    linkUrl = "#" // URL for the link (default is '#')
}) {
    return (
        <div className="mb-10">
            <div className="flex justify-center">
                <img src={configData.LogoSource} alt={configData.LogoAlt} border="0" width={configData.LogoWidth} />
                {/* Display an image with source, alt text, and width from configuration */}
            </div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900">
                {heading} {/* Display the main heading text */}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 mt-5">
                {paragraph} {' '} {/* Display the paragraph text with spacing */}
                <Link to={linkUrl} className="font-medium text-purple-600 hover:text-purple-500">
                    {linkName} {/* Display a link with provided name and styling */}
                </Link>
            </p>
        </div>
    );
}