import React, { useState, useRef, useEffect } from 'react';

function TextInput() {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dotCount, setDotCount] = useState(0);

    const abortControllerRef = useRef(null);
    const dotIntervalRef = useRef(null);

    // imitate loading process by adding dots every 1/2 second to the text field
    useEffect(() => {
        if (isLoading) {
            dotIntervalRef.current = setInterval(() => {
                setDotCount(prevCount => (prevCount + 1) % 4);
            }, 500);
        } else {
            // if no loading anymore, remove all dots
            clearInterval(dotIntervalRef.current);
            setDotCount(0);
        }

        return () => clearInterval(dotIntervalRef.current);
    }, [isLoading]);

    // submit action
    const handleSubmit = async () => {
        setIsLoading(true);
        setInputValue('');

        // abort controller for emitter interruptor
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('http://localhost:8080/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: inputValue,
                // adding signal to the fetch request
                signal: abortControllerRef.current.signal
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
                    // continue reading until there is nothing to read
                    readData();
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
    // method to abort transmission
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsLoading(false);
        setInputValue('Cancelled by user');
    };

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
