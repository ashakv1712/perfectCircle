'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PerfectCircle() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [showTooClose, setShowTooClose] = useState(false);
  const [showInvalidPath, setShowInvalidPath] = useState(false);
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
      try {
        const { data, error } = await supabase
          .from('scores')
          .select('name, score')
          .order('score', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error('Error fetching leaderboard:', error);
          return;
        }
        
        setLeaderboard(data || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };
    fetchLeaderboard();
  }, []);

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
    ctx.fillStyle = '#001f3f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the path if there are points
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      // Rainbow effect for the line
      for (let i = 1; i < points.length; i++) {
        const progress = i / points.length;
        ctx.strokeStyle = `hsl(${progress * 360}, 100%, 50%)`;
        ctx.lineWidth = canvas.width * 0.008;
        ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
      }
    }
    
    // Draw center text with larger exclusion zone
    ctx.font = `${canvas.width * 0.045}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Draw a perfect circle', canvas.width / 2, canvas.height / 2);
    ctx.fillText('AROUND this text', canvas.width / 2, canvas.height / 2 + canvas.width * 0.06);
    
    // Draw exclusion zone indicator (subtle)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const exclusionRadius = canvas.width * 0.15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, exclusionRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Show live score while drawing
    if (isDrawing && liveScore !== null) {
      ctx.font = `${canvas.width * 0.06}px Arial`;
      ctx.fillStyle = getColorForScore(liveScore);
      ctx.fillText(`${liveScore}%`, canvas.width / 2, canvas.height / 2 + canvas.height * 0.2);
    }
    
    // Show final score when done
    if (!isDrawing && score !== null) {
      ctx.font = `${canvas.width * 0.08}px Arial`;
      ctx.fillStyle = getColorForScore(score);
      ctx.fillText(`${score}%`, canvas.width / 2, canvas.height / 2 + canvas.height * 0.2);
    }
    
    if (bestScore !== null) {
      ctx.font = `${canvas.width * 0.04}px Arial`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`Best: ${bestScore}%`, canvas.width / 2, canvas.height / 2 + canvas.height * 0.28);
    }
    
    if (showTooClose) {
      ctx.font = `${canvas.width * 0.05}px Arial`;
      ctx.fillStyle = '#F44336';
      ctx.fillText('Too close to center!', canvas.width / 2, canvas.height / 2 + canvas.height * 0.35);
    }
    
    if (showInvalidPath) {
      ctx.font = `${canvas.width * 0.05}px Arial`;
      ctx.fillStyle = '#F44336';
      ctx.fillText('Invalid circle path!', canvas.width / 2, canvas.height / 2 + canvas.height * 0.35);
    }
  };

  const getColorForScore = (score) => {
    if (score >= 95) return '#00ff00';
    if (score >= 90) return '#32cd32';
    if (score >= 85) return '#7cfc00';
    if (score >= 80) return '#adff2f';
    if (score >= 70) return '#ffd700';
    if (score >= 60) return '#ffa500';
    if (score >= 50) return '#ff6347';
    if (score >= 40) return '#ff4500';
    return '#ff0000';
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setPoints([]);
    setScore(null);
    setLiveScore(null);
    setShowTooClose(false);
    setShowInvalidPath(false);
    
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
    const exclusionRadius = canvas.width * 0.15;
    
    if (distanceToCenter < exclusionRadius) {
      setShowTooClose(true);
      setShowInvalidPath(false);
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
      return;
    } else {
      setShowTooClose(false);
    }
    
    setPoints(prev => {
      const newPoints = [...prev, { x, y }];
      
      // Calculate live score every 8 points for better performance
      if (newPoints.length > 15 && newPoints.length % 8 === 0) {
        calculateLiveScore(newPoints);
      }
      
      return newPoints;
    });
    
    redrawCanvas();
  };

  const calculateLiveScore = (currentPoints) => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Check if path is valid
    if (!isValidCirclePath(currentPoints)) {
      setShowInvalidPath(true);
      setLiveScore(0);
      return;
    }
    
    const liveScoreValue = calculateAdvancedCircularityScore(currentPoints, centerX, centerY, canvas.width);
    setLiveScore(Math.round(liveScoreValue * 10) / 10);
  };

  const isValidCirclePath = (pathPoints) => {
    if (pathPoints.length < 20) return true;
    
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const exclusionRadius = canvas.width * 0.15;
    
    // Check if any point goes through the exclusion zone
    for (let point of pathPoints) {
      const distance = Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
      if (distance < exclusionRadius) {
        return false;
      }
    }
    
    return true;
  };

  const calculateAdvancedCircularityScore = (pathPoints, centerX, centerY, canvasWidth) => {
    if (pathPoints.length < 20) return 0;
    
    // 1. Calculate the center of the drawn shape
    let sumX = 0, sumY = 0;
    pathPoints.forEach(point => {
      sumX += point.x;
      sumY += point.y;
    });
    const shapeCenter = { x: sumX / pathPoints.length, y: sumY / pathPoints.length };
    
    // 2. Calculate distances from shape center
    const distances = pathPoints.map(point => 
      Math.sqrt(Math.pow(point.x - shapeCenter.x, 2) + Math.pow(point.y - shapeCenter.y, 2))
    );
    
    // 3. Calculate average radius and standard deviation
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) / distances.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 4. Check for line-like or square-like patterns
    const linearityPenalty = calculateLinearityPenalty(pathPoints);
    const squarenessPenalty = calculateSquarenessPenalty(pathPoints, shapeCenter);
    
    // 5. Calculate closure bonus
    const closureBonus = calculateClosureBonus(pathPoints);
    
    // 6. Check if shape actually goes around the center
    const enclosurePenalty = calculateEnclosurePenalty(pathPoints, centerX, centerY);
    
    // 7. Base score from radius consistency
    const radiusConsistency = Math.max(0, 100 - (standardDeviation / avgRadius) * 150);
    
    // 8. Apply adjustments
    let rawScore = radiusConsistency;
    rawScore -= linearityPenalty * 0.3;
    rawScore -= squarenessPenalty * 0.3;
    rawScore += closureBonus;
    rawScore -= enclosurePenalty * 0.4;
    
    // Ensure minimum score of 80% for properly closed circles
    const isWellClosed = closureBonus > 15; // More than 75% of max closure bonus
    const hasGoodRotation = enclosurePenalty === 0;
    
    if (isWellClosed && hasGoodRotation) {
      rawScore = Math.max(rawScore, 80); // Minimum 80% for properly closed circles
    }
    
    // Cap at 99% to keep 100% very rare but possible
    return Math.min(rawScore, 99);
  };

  const calculateLinearityPenalty = (pathPoints) => {
    if (pathPoints.length < 10) return 0;
    
    let straightSegments = 0;
    const threshold = 0.2;
    
    for (let i = 3; i < pathPoints.length - 3; i++) {
      const p1 = pathPoints[i - 2];
      const p2 = pathPoints[i];
      const p3 = pathPoints[i + 2];
      
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      const angleDiff = Math.abs(angle1 - angle2);
      
      if (angleDiff < threshold || angleDiff > (2 * Math.PI - threshold)) {
        straightSegments++;
      }
    }
    
    return Math.min((straightSegments / pathPoints.length) * 100, 40);
  };

  const calculateSquarenessPenalty = (pathPoints, center) => {
    if (pathPoints.length < 20) return 0;
    
    let corners = 0;
    const cornerThreshold = Math.PI / 4;
    
    for (let i = 8; i < pathPoints.length - 8; i++) {
      const p1 = pathPoints[i - 6];
      const p2 = pathPoints[i];
      const p3 = pathPoints[i + 6];
      
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      const angleDiff = Math.abs(angle1 - angle2);
      
      if (angleDiff > cornerThreshold && angleDiff < (2 * Math.PI - cornerThreshold)) {
        corners++;
      }
    }
    
    return Math.min(corners * 15, 50);
  };

  const calculateClosureBonus = (pathPoints) => {
    if (pathPoints.length < 10) return 0;
    
    const start = pathPoints[0];
    const end = pathPoints[pathPoints.length - 1];
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    const avgDistance = pathPoints.reduce((sum, point, i) => {
      if (i === 0) return sum;
      const prev = pathPoints[i - 1];
      return sum + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
    }, 0) / (pathPoints.length - 1);
    
    // Calculate closure quality (0-1) where 1 is perfectly closed
    const closureQuality = 1 - Math.min(distance / (avgDistance * 0.5), 1);
    
    // Return a bonus between 0-20 points based on closure quality
    return closureQuality * 20;
  };

  const calculateEnclosurePenalty = (pathPoints, centerX, centerY) => {
    let angleSum = 0;
    
    for (let i = 1; i < pathPoints.length; i++) {
      const p1 = pathPoints[i - 1];
      const p2 = pathPoints[i];
      
      const angle1 = Math.atan2(p1.y - centerY, p1.x - centerX);
      const angle2 = Math.atan2(p2.y - centerY, p2.x - centerX);
      
      let angleDiff = angle2 - angle1;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      angleSum += angleDiff;
    }
    
    const totalRotation = Math.abs(angleSum);
    
    if (totalRotation < Math.PI * 0.8) return 60;
    if (totalRotation < Math.PI * 1.2) return 30;
    if (totalRotation < Math.PI * 1.5) return 15;
    if (totalRotation < Math.PI * 1.7) return 5;
    
    return 0;
  };

  const stopDrawing = () => {
    if (!isDrawing || points.length < 20) {
      setIsDrawing(false);
      setShowInvalidPath(true);
      return;
    }
    
    setIsDrawing(false);
    calculateFinalScore();
  };

  const calculateFinalScore = () => {
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    if (!isValidCirclePath(points)) {
      setScore(0);
      setShowInvalidPath(true);
      redrawCanvas();
      return;
    }
    
    const finalScore = calculateAdvancedCircularityScore(points, centerX, centerY, canvas.width);
    const roundedScore = Math.round(finalScore * 10) / 10;
    
    setScore(roundedScore);
    setShowInvalidPath(false);
    
    if (bestScore === null || roundedScore > bestScore) {
      setBestScore(roundedScore);
    }
    
    if (roundedScore > 70) {
      setShowNameInput(true);
    }
    
    redrawCanvas();
  };

  const submitScore = async () => {
    if (!name.trim()) return;
    
    try {
      const { error } = await supabase
        .from('scores')
        .insert([{ 
          name: name.trim(), 
          score: score 
        }]);
      
      if (error) {
        console.error('Error submitting score:', error);
        return;
      }
      
      // Refresh leaderboard after submission
      const { data } = await supabase
        .from('scores')
        .select('name, score')
        .order('score', { ascending: false })
        .limit(5);
      
      setLeaderboard(data || []);
      setShowNameInput(false);
      setName('');
    } catch (error) {
      console.error('Error submitting score:', error);
      setShowNameInput(false);
      setName('');
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(redrawCanvas);
    return () => cancelAnimationFrame(requestRef.current);
  }, [points, score, bestScore, liveScore, isDrawing, showTooClose, showInvalidPath]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#001f3f',
      padding: '20px',
      color: '#fff',
      position: 'relative'
    }}>
      <h1 style={{ marginBottom: '20px', fontSize: '2rem' }}>Perfect Circle Challenge</h1>

      {/* Leaderboard */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        background: 'rgba(0, 0, 0, 0.8)', 
        padding: '15px', 
        borderRadius: '8px',
        minWidth: '200px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #555', paddingBottom: '5px' }}>
          Top Scores
        </h3>
        {leaderboard.length > 0 ? (
          <ol style={{ paddingLeft: '20px', margin: '10px 0 0 0' }}>
            {leaderboard.map((entry, index) => (
              <li key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '5px'
              }}>
                <span>{entry.name}</span>
                <span style={{ 
                  fontFamily: 'monospace',
                  color: getColorForScore(entry.score)
                }}>
                  {entry.score}%
                </span>
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
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          backgroundColor: '#001f3f',
          touchAction: 'none',
          cursor: 'crosshair',
          boxShadow: '0 0 20px rgba(0, 123, 255, 0.3)'
        }}
      />
      
      <div style={{ marginTop: '25px', textAlign: 'center', maxWidth: '600px' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
          🎯 Draw a perfect circle <strong>AROUND</strong> the center text
        </p>
        <p style={{ fontSize: '0.95rem', opacity: 0.8 }}>
          • Stay outside the dotted boundary • Complete the full circle • Avoid straight lines and corners
        </p>
        <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '10px' }}>
          Scoring is extremely strict - even 90%+ is exceptional!
        </p>
      </div>
      
      {/* Score display outside canvas */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        {score !== null && (
          <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>
            Your score: <span style={{ 
              color: getColorForScore(score),
              fontWeight: 'bold',
              fontSize: '1.6rem'
            }}>
              {score}%
            </span>
            {score > 70 && (
              <button
                style={{
                  background: '#4CAF50',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  marginLeft: '15px',
                  fontSize: '1rem',
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
            Personal best: <span style={{ color: getColorForScore(bestScore) }}>{bestScore}%</span>
          </div>
        )}
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#0a2d4d',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '450px',
            width: '90%',
            border: '2px solid #ffd700',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
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
                color: 'black',
                boxSizing: 'border-box'
              }}
              maxLength={20}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNameInput(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#555',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitScore}
                disabled={!name.trim()}
                style={{
                  flex: 1,
                  background: name.trim() ? 'linear-gradient(45deg, #4CAF50, #45a049)' : '#8abb8d',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                🌟 Submit to Hall of Fame
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}