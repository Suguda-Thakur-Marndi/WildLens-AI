// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CameraModal from '../components/CameraModal';

describe('CameraModal Component & getUserMedia Integration', () => {
  let mockTracks: any[];
  let mockStream: any;
  let getUserMediaMock: any;

  beforeEach(() => {
    mockTracks = [
      {
        kind: 'video',
        stop: vi.fn(),
      },
    ];

    mockStream = {
      getTracks: vi.fn(() => mockTracks),
      getVideoTracks: vi.fn(() => mockTracks),
    };

    getUserMediaMock = vi.fn().mockResolvedValue(mockStream);

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: getUserMediaMock,
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam1', label: 'Back Camera' },
          { kind: 'videoinput', deviceId: 'cam2', label: 'Front Camera' },
        ]),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests environment-facing camera on mount when open', async () => {
    render(<CameraModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />);

    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalledWith({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    });
  });

  it('stops all active media tracks when the close button is clicked', async () => {
    const handleClose = vi.fn();
    render(<CameraModal isOpen={true} onClose={handleClose} onCapture={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close camera/i })).toBeDefined();
    });

    const closeBtn = screen.getByRole('button', { name: /close camera/i });
    fireEvent.click(closeBtn);

    expect(mockTracks[0].stop).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('stops all active media tracks on component unmount', async () => {
    const { unmount } = render(
      <CameraModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />
    );

    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalled();
    });

    unmount();
    expect(mockTracks[0].stop).toHaveBeenCalled();
  });

  it('handles permission denied error (NotAllowedError) gracefully', async () => {
    const notAllowedError = new Error('Permission denied');
    notAllowedError.name = 'NotAllowedError';
    getUserMediaMock.mockRejectedValueOnce(notAllowedError);

    render(<CameraModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/camera permission denied/i)).toBeDefined();
      expect(screen.getByText(/permission was denied/i)).toBeDefined();
    });
  });

  it('handles device not found error (NotFoundError) gracefully', async () => {
    const notFoundError = new Error('No device found');
    notFoundError.name = 'NotFoundError';
    getUserMediaMock.mockRejectedValueOnce(notFoundError);

    render(<CameraModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/no camera detected/i)).toBeDefined();
      expect(screen.getByText(/no camera hardware detected/i)).toBeDefined();
    });
  });

  it('handles camera already in use error (NotReadableError) gracefully', async () => {
    const inUseError = new Error('Device in use');
    inUseError.name = 'NotReadableError';
    getUserMediaMock.mockRejectedValueOnce(inUseError);

    render(<CameraModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/camera currently in use/i)).toBeDefined();
      expect(screen.getByText(/another application or tab/i)).toBeDefined();
    });
  });

  it('handles insecure context error gracefully', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      writable: true,
      configurable: true,
    });
    // simulate non-localhost origin
    Object.defineProperty(window, 'location', {
      value: { hostname: '192.168.1.100' },
      writable: true,
      configurable: true,
    });

    render(<CameraModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/insecure context/i)).toBeDefined();
    });
  });
});
