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
                height: '100%',
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid',
                borderColor: isActiveSpeaker ? 'white' : 'transparent',
                transition: 'border-color 0.3s ease-in-out',
            }}
        >
            <DyteParticipantTile
                participant={participant}
                meeting={meeting}
                style={{
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

const renderJudgeLayout = (
    judgeParticipants: DyteParticipant[],
    lastActiveSpeaker: string,
    meeting: any
) => {
    if (judgeParticipants.length === 1) {
        return (
            <div
                style={{
                    width: '33.33%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '10px',
                    minHeight: '100%',
                }}
            >
                <div style={{ width: '100%', flex: 1 }}>
                    <ParticipantTile
                        participant={judgeParticipants[0]}
                        presetName={judgeParticipants[0].presetName as PresetName}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === judgeParticipants[0].id}
                    />
                </div>
                <div style={{ marginTop: '20px' }}>
                    <img
                        src={logo}
                        alt="Logo"
                        style={{
                            maxWidth: '150px',
                            maxHeight: '150px',
                            objectFit: 'contain',
                        }}
                    />
                </div>
            </div>
        );
    } else if (judgeParticipants.length === 2) {
        return (
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '10px',
                    zIndex: 1,
                    pointerEvents: 'none',
                }}
            >
                <div style={{
                    width: '100%',
                    height: '25vh',
                    pointerEvents: 'auto'
                }}>
                    <ParticipantTile
                        participant={judgeParticipants[0]}
                        presetName={judgeParticipants[0].presetName as PresetName}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === judgeParticipants[0].id}
                    />
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'auto'
                }}>
                    <img
                        src={logo}
                        alt="Logo"
                        style={{
                            maxWidth: '150px',
                            maxHeight: '150px',
                            objectFit: 'contain',
                        }}
                    />
                </div>

                <div style={{
                    width: '100%',
                    height: '25vh',
                    pointerEvents: 'auto'
                }}>
                    <ParticipantTile
                        participant={judgeParticipants[1]}
                        presetName={judgeParticipants[1].presetName as PresetName}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === judgeParticipants[1].id}
                    />
                </div>
            </div>
        );
    }
    return null;
};

const renderParticipantsLayout = (
    leftColumnParticipants: DyteParticipant[],
    rightColumnParticipants: DyteParticipant[],
    judgeCount: number,
    lastActiveSpeaker: string,
    meeting: any
) => {
    const participantStyle = judgeCount === 2 ? {
        width: '50%',
        padding: '10px',
        height: '100%',
        zIndex: 2,
    } : {
        width: '33.33%',
        padding: '10px',
    };

    return (
        <>
            <div
                style={{
                    ...participantStyle,
                    display: 'grid',
                    gridTemplateRows: `repeat(${leftColumnParticipants.length}, 1fr)`,
                    gap: '10px',
                }}
            >
                {leftColumnParticipants.map((participant) => (
                    <ParticipantTile
                        key={participant.id}
                        participant={participant}
                        presetName={participant.presetName as PresetName}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === participant.id}
                    />
                ))}
            </div>

            {judgeCount === 2 && <div style={{ width: '0%' }} />}

            <div
                style={{
                    ...participantStyle,
                    display: 'grid',
                    gridTemplateRows: `repeat(${rightColumnParticipants.length}, 1fr)`,
                    gap: '10px',
                }}
            >
                {rightColumnParticipants.map((participant) => (
                    <ParticipantTile
                        key={participant.id}
                        participant={participant}
                        presetName={participant.presetName as PresetName}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === participant.id}
                    />
                ))}
            </div>
        </>
    );
};

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
                }}
            >
                {renderParticipantsLayout(
                    leftColumnParticipants,
                    rightColumnParticipants,
                    judgeParticipants.length,
                    lastActiveSpeaker,
                    meeting
                )}
                {renderJudgeLayout(judgeParticipants, lastActiveSpeaker, meeting)}
            </div>
            <DyteParticipantsAudio meeting={meeting} />
        </main>
    );
}