import React, { useState, useRef, useEffect } from 'react';

function TextInput() {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dotCount, setDotCount] = useState(0);
    const abortControllerRef = useRef(null); // Reference to the abort controller
    const dotIntervalRef = useRef(null); // Reference to the interval for dots

    useEffect(() => {
        if (isLoading) {
            dotIntervalRef.current = setInterval(() => {
                setDotCount(prevCount => (prevCount + 1) % 4); // Cycles 0, 1, 2, 3, 0, 1, 2, 3, ...
            }, 500); // Update every 500ms
        } else {
            clearInterval(dotIntervalRef.current);
            setDotCount(0);
        }

        return () => clearInterval(dotIntervalRef.current);
    }, [isLoading]);

    // Function to handle the submit action
    const handleSubmit = async () => {
        setIsLoading(true);
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
                    const { value, done } = await reader.read();
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
        setInputValue('Cancelled by user');
    };

    // Function to clear the input field
    const handleClear = () => {
        setInputValue('');
        setIsLoading(false);
    };

    return (
        <div>
            <input
                type="text"
                value={inputValue + '.'.repeat(dotCount)}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                style={{ width: '500px' }}
            />
            <button onClick={handleSubmit} disabled={isLoading}>Convert</button>
            <button onClick={handleClear} disabled={isLoading}>Clear</button>
            {isLoading && <button onClick={handleCancel}>Cancel</button>}
        </div>
    );
}

export default TextInput;
