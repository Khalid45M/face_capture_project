import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export const useFaceDetection = (videoRef, canvasRef, isActive) => {
    const [model, setModel] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [detections, setDetections] = useState([]);
    const [error, setError] = useState(null);

    const animationRef = useRef(null);

    // Load model
    useEffect(() => {
        const loadModel = async () => {
            try {
                setIsLoading(true);
                await tf.ready();
                const loadedModel = await blazeface.load();
                setModel(loadedModel);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadModel();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Detection loop
    const detectFaces = useCallback(async () => {
        if (!model || !isActive || !videoRef.current || !canvasRef.current) {
            return;
        }

        try {
            const video = videoRef.current.video;
            if (video.readyState !== 4) {
                animationRef.current = requestAnimationFrame(detectFaces);
                return;
            }

            const predictions = await model.estimateFaces(video, false);
            setDetections(predictions);

            animationRef.current = requestAnimationFrame(detectFaces);
        } catch (err) {
            setError(err.message);
        }
    }, [model, isActive, videoRef, canvasRef]);

    // Start/stop detection
    useEffect(() => {
        if (isActive && model) {
            detectFaces();
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            setDetections([]);
        }
    }, [isActive, model, detectFaces]);

    return { detections, isLoading, error };
};