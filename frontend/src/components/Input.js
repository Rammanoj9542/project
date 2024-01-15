// Define a CSS class for the input element with various styles
const fixedInputClass = "rounded-md appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"

// Functional component for an input element
export default function Input({
    handleChange,   // Function to handle input changes
    value,          // Current value of the input
    labelText,      // Text for the input label
    labelFor,       // 'for' attribute of the input label
    id,             // 'id' attribute of the input element
    name,           // 'name' attribute of the input element
    type,           // Input type (e.g., text, password)
    isRequired = false, // Flag to indicate if the input is required
    placeholder,    // Placeholder text for the input
    maxLength,      // Maximum length of the field
    minLength,      // Minimum length of the field
    customClass,     // Custom CSS class to be applied to the input element
    isDisabled,      // Flag to indicate if the input is disabled
    multiple,       // Flag to enable multiple file selection
    accept          // File types accepted by the input
}) {
    return (
        <div className="my-5">
            <label htmlFor={labelFor} className="sr-only">
                {labelText}  {/* Display the input label text (hidden for screen readers) */}
            </label>
            <input
                onChange={handleChange}   // Attach the provided change handler function
                value={value}            // Set the current value of the input
                id={id}                  // Assign the provided 'id' attribute
                name={name}              // Assign the provided 'name' attribute
                type={type}              // Specify the input type (e.g., text, password)
                required={isRequired}    // Set 'required' attribute based on the 'isRequired' flag
                className={fixedInputClass + customClass} // Apply CSS classes for styling
                placeholder={placeholder} // Set the placeholder text for the input
                maxLength={maxLength}
                minLength={minLength}
                disabled={isDisabled}    // Set the 'disabled' attribute based on the 'isDisabled' flag
                multiple={multiple}      // Enable multiple file selection
                accept={accept}
            />
        </div>
    )
}