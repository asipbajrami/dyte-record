import React, { useEffect, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import {
    DyteParticipantsAudio,
    DyteParticipantTile,
    DyteNameTag,
    DyteAudioVisualizer,
} from '@dytesdk/react-ui-kit';
import { useDyteMeeting, useDyteSelector } from '@dytesdk/react-web-core';
import { DyteParticipant } from '@dytesdk/web-core';
import logo from '../assets/logo.png';

const AFFIRMATIVE = 'affirmative';
const NEGATIVE = 'negative';
const JUDGE = 'judge';
const SOLO = 'solo';

type PresetName = typeof AFFIRMATIVE | typeof NEGATIVE | typeof JUDGE | typeof SOLO;

const presetColors: { [key in PresetName]: string } = {
    [AFFIRMATIVE]: '#043B6D', // Blue
    [NEGATIVE]: '#641316',    // Red
    [JUDGE]: '#0D0B0E',      // Black
    [SOLO]: '#471a55',       // Purple
};

const ParticipantTile = React.memo(({
                                        participant,
                                        presetName,
                                        meeting,
                                        isActiveSpeaker,
                                    }: {
    participant: DyteParticipant;
    presetName: PresetName;
    meeting: any;
    isActiveSpeaker: boolean;
}) => {
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        console.log(`Participant ${participant.name} (${participant.id}): Video track status:`, participant.videoEnabled);

        const checkVideoTrack = () => {
            if (participant.videoEnabled && participant.videoTrack) {
                console.log(`Participant ${participant.name} (${participant.id}): Video track ready`);
                setIsVideoReady(true);
            } else {
                console.log(`Participant ${participant.name} (${participant.id}): Video track not ready`);
                setIsVideoReady(false);
            }
        };

        checkVideoTrack();

        const videoUpdateListener = () => {
            console.log(`Participant ${participant.name} (${participant.id}): Video update event`);
            checkVideoTrack();
        };

        participant.on('videoUpdate', videoUpdateListener);

        return () => {
            participant.off('videoUpdate', videoUpdateListener);
        };
    }, [participant]);

    return (
        <div
            key={participant.id}
            style={{
                width: '100%',
                position: 'relative',
                borderRadius: '12px', // Slightly increased border radius
                overflow: 'hidden',
                border: isActiveSpeaker ? '4px solid rgba(255, 255, 255, 0.8)' : '2px solid transparent', // Enhanced active speaker border
                boxShadow: isActiveSpeaker ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none', // Added subtle glow for active speaker
                transition: 'all 0.3s ease-in-out',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                }}
            >
                <DyteParticipantTile
                    key={participant.id}
                    participant={participant}
                    meeting={meeting}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        transition: 'all 0.3s ease-in-out',
                    }}
                >
                    <DyteNameTag
                        participant={participant}
                        style={{
                            backgroundColor: presetColors[presetName],
                            color: 'white',
                        }}
                    >
                        <DyteAudioVisualizer participant={participant} slot="start" />
                    </DyteNameTag>
                </DyteParticipantTile>
            </div>
            {!isVideoReady && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                }}>
                    Loading...
                </div>
            )}
        </div>
    );
});

export default function RecordingView() {
    const { meeting } = useDyteMeeting();
    const [participants, setParticipants] = useState<DyteParticipant[]>([]);

    // Get active speaker using useDyteSelector
    const lastActiveSpeaker = useDyteSelector(
        (meeting) => meeting.participants.lastActiveSpeaker
    );

    const joinedParticipants = useDyteSelector((meeting) =>
        meeting.participants.joined.toArray()
    );

    const debouncedSetParticipants = useCallback(
        debounce((updater: (prev: DyteParticipant[]) => DyteParticipant[]) => {
            setParticipants(updater);
        }, 100),
        []
    );

    useEffect(() => {
        console.log('Joined participants:', joinedParticipants);
        debouncedSetParticipants(() => joinedParticipants);

        const handleParticipantJoin = (participant: DyteParticipant) => {
            console.log('Participant joined:', participant);
            debouncedSetParticipants((prev) => [...prev, participant]);
        };

        const handleParticipantLeave = (participant: DyteParticipant) => {
            console.log('Participant left:', participant);
            debouncedSetParticipants((prev) => prev.filter((p) => p.id !== participant.id));
        };

        // Subscribe to activeSpeaker events
        const handleActiveSpeaker = ({ peerId, volume }: { peerId: string, volume: number }) => {
            console.log(`Active speaker: ${peerId} with volume ${volume}`);
        };

        meeting.participants.on('activeSpeaker', handleActiveSpeaker);
        meeting.participants.joined.on('participantJoined', handleParticipantJoin);
        meeting.participants.joined.on('participantLeft', handleParticipantLeave);

        return () => {
            meeting.participants.joined.off('participantJoined', handleParticipantJoin);
            meeting.participants.joined.off('participantLeft', handleParticipantLeave);
            meeting.participants.off('activeSpeaker', handleActiveSpeaker);
        };
    }, [meeting, joinedParticipants, debouncedSetParticipants]);

    const getParticipantsByPreset = (
        presetNames: PresetName | PresetName[]
    ): DyteParticipant[] => {
        const names = Array.isArray(presetNames) ? presetNames : [presetNames];
        return participants.filter(
            (p) => p.presetName && names.includes(p.presetName as PresetName)
        );
    };

    const negativeParticipants = getParticipantsByPreset(NEGATIVE);
    const affirmativeParticipants = getParticipantsByPreset(AFFIRMATIVE);
    const judgeParticipants = getParticipantsByPreset(JUDGE);
    const soloParticipants = getParticipantsByPreset(SOLO);

    const leftColumnParticipants = [...negativeParticipants];
    const rightColumnParticipants = [...affirmativeParticipants];

    soloParticipants.forEach((participant, index) => {
        if (index % 2 === 0) {
            leftColumnParticipants.push(participant);
        } else {
            rightColumnParticipants.push(participant);
        }
    });

    const renderParticipantsColumn = (
        participants: DyteParticipant[],
        columnStyle: React.CSSProperties
    ) => {
        // Calculate height for each participant
        const participantHeight = participants.length === 1 ? '100%' : '49%';

        return (
            <div
                style={{
                    ...columnStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '4px',
                    height: '100%',
                }}
            >
                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        style={{
                            height: participantHeight,
                            minHeight: participants.length === 1 ? '100%' : '300px', // Minimum height for participants
                        }}
                    >
                        <ParticipantTile
                            participant={participant}
                            presetName={participant.presetName as PresetName}
                            meeting={meeting}
                            isActiveSpeaker={lastActiveSpeaker === participant.id}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <main
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                height: '100vh',
                backgroundColor: '#000',
                color: 'white',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    gap: '4px',
                }}
            >
                {renderParticipantsColumn(leftColumnParticipants, {
                    width: '33.33%',
                    minWidth: '33.33%',
                })}

                <div
                    style={{
                        width: '33.33%',
                        minWidth: '33.33%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start', // Changed to start from top
                        padding: '4px',
                    }}
                >
                    {renderParticipantsColumn(judgeParticipants, {
                        width: '100%',
                        flex: '1 1 auto',
                    })}
                    <div
                        style={{
                            marginTop: '12px',
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <img
                            src={logo}
                            alt="Logo"
                            style={{
                                width: '120px',
                                height: '120px',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                </div>

                {renderParticipantsColumn(rightColumnParticipants, {
                    width: '33.33%',
                    minWidth: '33.33%',
                })}
            </div>
            <DyteParticipantsAudio meeting={meeting} />
        </main>
    );
}