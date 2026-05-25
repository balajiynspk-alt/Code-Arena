/**
 * Automatic background code recording and compilation diagnostics tracker.
 */
export class CodeRecorder {
  constructor() {
    this.events = [];
    this.markers = []; // { type: 'hesitation' | 'run' | 'accepted', timestamp, text }
    this.startTime = Date.now();
    this.lastEditTime = Date.now();
    
    this.writtenChars = 0;
    this.deletedChars = 0;
    this.pauseCount = 0;
    this.lastCodeLength = 0;
  }

  start(initialCode = "") {
    this.events = [];
    this.markers = [];
    this.startTime = Date.now();
    this.lastEditTime = Date.now();
    this.writtenChars = 0;
    this.deletedChars = 0;
    this.pauseCount = 0;
    this.lastCodeLength = initialCode.length;
    
    // Add seed frame event
    this.events.push({
      timestamp: 0,
      value: initialCode
    });
  }

  recordEdit(code) {
    if (this.events.length > 0 && this.events[this.events.length - 1].value === code) {
      return; // No redundant updates
    }

    const now = Date.now();
    const relativeTime = Math.floor((now - this.startTime) / 1000);
    const timeDelta = (now - this.lastEditTime) / 1000;

    // Hesitation Pause Heuristic (> 5 seconds of idle prior to edit)
    if (this.events.length > 0 && timeDelta > 5) {
      this.pauseCount += 1;
      this.markers.push({
        type: 'hesitation',
        timestamp: relativeTime,
        text: 'Pause > 5s before typing'
      });
    }

    // Track write vs delete footprints
    const diff = code.length - this.lastCodeLength;
    if (diff > 0) {
      this.writtenChars += diff;
    } else if (diff < 0) {
      this.deletedChars += Math.abs(diff);
      
      // Large deletes trigger a hesitation marker (substantial rewrite)
      if (Math.abs(diff) > 10) {
        this.markers.push({
          type: 'hesitation',
          timestamp: relativeTime,
          text: `Hesitation: Deleted ${Math.abs(diff)} characters`
        });
      }
    }

    this.events.push({
      timestamp: relativeTime,
      value: code
    });

    this.lastEditTime = now;
    this.lastCodeLength = code.length;
  }

  recordMarker(type, detail = "") {
    const relativeTime = Math.max(0, Math.floor((Date.now() - this.startTime) / 1000));
    this.markers.push({
      type, // 'run' | 'accepted'
      timestamp: relativeTime,
      text: detail
    });
  }

  getPayload() {
    const totalTime = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
    return {
      events: this.events,
      markers: this.markers,
      totalTime,
      solveTime: totalTime,
      deletedChars: this.deletedChars,
      writtenChars: this.writtenChars,
      pauseCount: this.pauseCount
    };
  }
}
