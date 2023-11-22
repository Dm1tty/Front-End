import React, { useState, useRef } from 'react';

function TextInput() {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingCharacter, setIsFetchingCharacter] = useState(false);
    const abortControllerRef = useRef(null); // Reference to the abort controller

    // Function to handle the submit action
    const handleSubmit = async () => {
        setIsLoading(true);
        setIsFetchingCharacter(false);
        setInputValue(''); // Clear the text field for the encoded text
        abortControllerRef.current = new AbortController(); // Create a new abort controller

        try {
            const response = await fetch('http://localhost:8080/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: inputValue,
                signal: abortControllerRef.current.signal // Attach the signal to the fetch request
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            const readData = async () => {
                try {
                    setIsFetchingCharacter(true);
                    const { value, done } = await reader.read();
                    setIsFetchingCharacter(false);
                    if (done) {
                        setIsLoading(false);
                        return;
                    }
                    setInputValue(prev => prev + decoder.decode(value, { stream: true }));
                    readData(); // Recursive call to continue reading
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('Fetch aborted');
                    } else {
                        console.error('Error reading data:', error);
                    }
                }
            };

            readData();
        } catch (error) {
            console.error('Error during data fetch:', error);
            setInputValue('Error fetching data');
            setIsLoading(false);
        }
    };

    // Function to cancel the ongoing process
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Abort the fetch request
        }
        setIsLoading(false);
        setIsFetchingCharacter(false);
        setInputValue('Cancelled by user');
    };

    // Function to clear the input field
    const handleClear = () => {
        setInputValue('');
        setIsFetchingCharacter(false);
    };

    return (
        <div>
            <input
                type="text"
                value={inputValue + (isFetchingCharacter ? '...' : '')}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
            />
            <button onClick={handleSubmit} disabled={isLoading}>Convert</button>
            <button onClick={handleClear} disabled={isLoading}>Clear</button>
            {isLoading && <button onClick={handleCancel}>Cancel</button>}
        </div>
    );
}

export default TextInput;
