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
        const checkVideoTrack = () => {
            if (participant.videoEnabled && participant.videoTrack) {
                setIsVideoReady(true);
            } else {
                setIsVideoReady(false);
            }
        };

        checkVideoTrack();

        const videoUpdateListener = () => {
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
                width: '95%',
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    border: isActiveSpeaker ? '4px solid rgba(255, 255, 255, 1)' : '4px solid rgba(255, 255, 255, 0)\'',
                    boxShadow: isActiveSpeaker ? '0 0 10px rgba(255, 255, 255, 0.3)' : '0 0 10px rgba(255, 255, 255, 0)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    marginBottom: '2px', // Small margin between participants
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
        debouncedSetParticipants(() => joinedParticipants);

        const handleParticipantJoin = (participant: DyteParticipant) => {
            debouncedSetParticipants((prev) => [...prev, participant]);
        };

        const handleParticipantLeave = (participant: DyteParticipant) => {
            debouncedSetParticipants((prev) => prev.filter((p) => p.id !== participant.id));
        };

        meeting.participants.joined.on('participantJoined', handleParticipantJoin);
        meeting.participants.joined.on('participantLeft', handleParticipantLeave);

        return () => {
            meeting.participants.joined.off('participantJoined', handleParticipantJoin);
            meeting.participants.joined.off('participantLeft', handleParticipantLeave);
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
        return (
            <div
                style={{
                    ...columnStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px', // Minimal gap between participants
                    padding: '2px', // Minimal padding
                    height: '100%',
                    overflow: 'hidden', // Prevent overflow
                }}
            >
                {participants.map((participant) => (
                    <ParticipantTile
                        key={participant.id}
                        participant={participant}
                        presetName={participant.presetName as PresetName}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === participant.id}
                    />
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
                    gap: '2px', // Minimal gap between columns
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
                        justifyContent: 'flex-start',
                        padding: '2px',
                    }}
                >
                    {renderParticipantsColumn(judgeParticipants, {
                        width: '100%',
                    })}
                    <div
                        style={{
                            marginTop: '4px',
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <img
                            src={logo}
                            alt="Logo"
                            style={{
                                width: '100px', // Reduced logo size
                                height: '100px',
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