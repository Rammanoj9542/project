// Functional component for rendering a form action element, like a button
export default function FormAction({
    handleSubmit,  // Function to handle form submission
    type = 'Button', // Type of form action element ('Button' by default)
    action = 'submit', // Action type (e.g., 'submit' by default)
    text // Text to display on the form action element
}) {
    return (
        <>
            {/* Use a conditional rendering based on the 'type' prop */}
            {
                type === 'Button' ? // If the 'type' is 'Button'
                    <button
                        type={action} // Set the button type to the specified action
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mt-10"
                        onSubmit={handleSubmit} // Attach the form submission handler
                    >
                        {text} {/* Display the provided text on the button */}
                    </button>
                    :
                    <></> // If the 'type' is not 'Button', render nothing (empty fragment)
            }
        </>
    );
}