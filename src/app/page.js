'use client'
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PerfectCircle() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [showTooClose, setShowTooClose] = useState(false);
  const [bestScore, setBestScore] = useState(null);
  const [liveScore, setLiveScore] = useState(null);
  const requestRef = useRef();
  const animationRef = useRef(0);
  
  // Score submission
  const [name, setName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [showNameInput, setShowNameInput] = useState(false);

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('scores')
        .select('name, score')
        .order('score', { ascending: false })
        .limit(5);
      setLeaderboard(data || []);
    };
    fetchLeaderboard();
  }, []);

  // Submit score to Supabase
  const submitScore = async () => {
    if (!name.trim()) return;
    
    const { error } = await supabase
      .from('scores')
      .insert([{ 
        name: name.trim(), 
        score: score 
      }]);
    
    if (!error) {
      // Refresh leaderboard
      const { data } = await supabase
        .from('scores')
        .select('name, score')
        .order('score', { ascending: false })
        .limit(5);
      setLeaderboard(data || []);
      
      setShowNameInput(false);
      setName('');
    }
  };

  // For testing
  const addTestScore = async () => {
    await supabase
      .from('scores')
      .insert([{ name: 'Test', score: 85.5 }]);
    
    // Refresh leaderboard after adding test score
    const { data } = await supabase
      .from('scores')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(5);
    setLeaderboard(data || []);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
      canvas.width = size;
      canvas.height = size;
      redrawCanvas();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(requestRef.current);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear with dark background
    ctx.fillStyle = '#001f3f'; // Navy background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the path if there are points
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      // Rainbow effect for the line
      for (let i = 1; i < points.length; i++) {
        const progress = i / points.length;
        ctx.strokeStyle = `hsl(${progress * 360}, 100%, 50%)`;
        ctx.lineWidth = canvas.width * 0.01;
        ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
      }
    }
    
    // Draw center text
    ctx.font = `${canvas.width * 0.05}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Draw a perfect circle', canvas.width / 2, canvas.height / 2);
    
    // Show live score while drawing
    if (isDrawing && liveScore !== null) {
      ctx.font = `${canvas.width * 0.08}px Arial`;
      ctx.fillStyle = getColorForScore(liveScore);
      ctx.fillText(`${liveScore}%`, canvas.width / 2, canvas.height / 2 + canvas.height * 0.15);
    }
    
    // Show final score when done
    if (!isDrawing && score !== null) {
      ctx.font = `${canvas.width * 0.08}px Arial`;
      ctx.fillStyle = getColorForScore(score);
      ctx.fillText(`${score}%`, canvas.width / 2, canvas.height / 2 + canvas.height * 0.15);
    }
    
    if (bestScore !== null) {
      ctx.font = `${canvas.width * 0.04}px Arial`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`Best: ${bestScore}%`, canvas.width / 2, canvas.height / 2 + canvas.height * 0.25);
    }
    
    if (showTooClose) {
      ctx.font = `${canvas.width * 0.05}px Arial`;
      ctx.fillStyle = '#F44336';
      ctx.fillText('Too close!', canvas.width / 2, canvas.height / 2 + canvas.height * 0.3);
    }
  };

  const getColorForScore = (score) => {
    // More sensitive color grading
    if (score > 95) return '#00ff00'; // Bright green
    if (score > 85) return '#7cfc00'; // Lawn green
    if (score > 75) return '#adff2f'; // Green-yellow
    if (score > 65) return '#ffd700'; // Gold
    if (score > 55) return '#ffa500'; // Orange
    if (score > 45) return '#ff6347'; // Tomato
    return '#ff0000'; // Red
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setPoints([]);
    setScore(null);
    setLiveScore(null);
    setShowTooClose(false);
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPoints([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if too close to center text
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const distanceToCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    if (distanceToCenter < canvas.width * 0.1) {
      setShowTooClose(true);
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      return;
    } else {
      setShowTooClose(false);
    }
    
    setPoints(prev => {
      const newPoints = [...prev, { x, y }];
      if (newPoints.length > 10) {
        // Calculate live score every 5 points for performance
        if (newPoints.length % 5 === 0) {
          calculateLiveScore(newPoints);
        }
      }
      return newPoints;
    });
    redrawCanvas();
  };

  const calculateLiveScore = (currentPoints) => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate average distance from center
    let totalDistance = 0;
    currentPoints.forEach(point => {
      totalDistance += Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
    });
    const avgDistance = totalDistance / currentPoints.length;
    
    // Calculate variance with more sensitivity
    let variance = 0;
    currentPoints.forEach(point => {
      const distance = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
      variance += Math.pow(distance - avgDistance, 2);
    });
    variance = variance / currentPoints.length;
    
    // More sensitive scoring
    const maxVariance = Math.pow(canvas.width * 0.2, 2); // Smaller max variance makes scoring stricter
    let rawScore = 100 * (1 - Math.min(variance / maxVariance, 1));
    
    // Apply exponential scaling to make high scores harder to achieve
    rawScore = Math.pow(rawScore / 100, 1.5) * 100;
    
    // Round to 1 decimal place
    const roundedScore = Math.round(rawScore * 10) / 10;
    
    setLiveScore(roundedScore);
  };

  const stopDrawing = () => {
    if (!isDrawing || points.length < 10) {
      setIsDrawing(false);
      return;
    }
    
    setIsDrawing(false);
    calculateFinalScore();
  };

  const calculateFinalScore = () => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate average distance from center
    let totalDistance = 0;
    points.forEach(point => {
      totalDistance += Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
    });
    const avgDistance = totalDistance / points.length;
    
    // Calculate variance with more sensitivity
    let variance = 0;
    points.forEach(point => {
      const distance = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
      variance += Math.pow(distance - avgDistance, 2);
    });
    variance = variance / points.length;
    
    // More sensitive scoring
    const maxVariance = Math.pow(canvas.width * 0.2, 2); // Smaller max variance makes scoring stricter
    let rawScore = 100 * (1 - Math.min(variance / maxVariance, 1));
    
    // Apply exponential scaling to make high scores harder to achieve
    rawScore = Math.pow(rawScore / 100, 1.5) * 100;
    
    // Round to 1 decimal place
    const roundedScore = Math.round(rawScore * 10) / 10;
    
    setScore(roundedScore);
    
    // Update best score
    if (bestScore === null || roundedScore > bestScore) {
      setBestScore(roundedScore);
    }
    
    // Show name input for good scores
    if (roundedScore > 70) {
      setShowNameInput(true);
    }
    
    redrawCanvas();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(redrawCanvas);
    return () => cancelAnimationFrame(requestRef.current);
  }, [points, score, bestScore, liveScore, isDrawing, showTooClose]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#001f3f', // Navy background
      padding: '20px',
      color: '#fff',
      position: 'relative'
    }}>
      <h1 style={{ marginBottom: '20px' }}>Perfect Circle</h1>

      {/* Leaderboard */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        background: 'rgba(0, 0, 0, 0.7)', 
        padding: '15px', 
        borderRadius: '8px',
        minWidth: '200px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #555', paddingBottom: '5px' }}>
          Top Scores
        </h3>
        {leaderboard.length > 0 ? (
          <ol style={{ paddingLeft: '20px', margin: '10px 0 0 0' }}>
            {leaderboard.map((entry, index) => (
              <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{entry.name}</span>
                <span style={{ fontFamily: 'monospace' }}>{entry.score}%</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>No scores yet</p>
        )}
      </div>
      
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrawing(e.touches[0]);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          draw(e.touches[0]);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stopDrawing();
        }}
        style={{
          border: '2px solid #fff',
          borderRadius: '8px',
          backgroundColor: '#001f3f',
          touchAction: 'none'
        }}
      />
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p>Draw a circle with your mouse or finger.</p>
        <p>Avoid drawing too close to the center text.</p>
      </div>
      
      {/* Score display outside canvas */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        {score !== null && (
          <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
            Your score: <span style={{ color: getColorForScore(score) }}>{score}%</span>
            {score > 70 && (
              <button
                style={{
                  background: '#4CAF50',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  marginLeft: '10px',
                  display: showNameInput ? 'none' : 'inline-block'
                }}
                onClick={() => setShowNameInput(true)}
              >
                Submit Score
              </button>
            )}
          </div>
        )}
        {bestScore !== null && (
          <div style={{ fontSize: '1.2rem' }}>
            Best score: <span style={{ color: getColorForScore(bestScore) }}>{bestScore}%</span>
          </div>
        )}
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#0a2d4d',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
              Submit Your Score: {score}%
            </h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '16px',
                borderRadius: '4px',
                border: 'none',
                color: 'black'
              }}
              maxLength={20}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowNameInput(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#555',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitScore}
                disabled={!name.trim()}
                style={{
                  flex: 1,
                  backgroundColor: name.trim() ? '#4CAF50' : '#8abb8d',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: name.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Controls - Remove in production */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '8px',
        borderRadius: '4px'
      }}>
 
      </div>
    </div>
  );
}