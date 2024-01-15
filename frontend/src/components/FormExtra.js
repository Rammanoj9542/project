// Functional component for rendering additional form-related content
export default function FormExtra() {
    return (
        <div className="flex items-center justify-between">
            {/* Create a flex container with items centered and justified between */}
            <div className="text-sm">
                {/* Create a text container with small font size */}
                <a href="/passwordreset" className="font-medium text-purple-600 hover:text-purple-500">
                    {/* Create a link with medium font weight and purple color, changing to a different shade on hover */}
                    Forgot your password? {/* Display the text content of the link */}
                </a>
            </div>
        </div>
    );
}
