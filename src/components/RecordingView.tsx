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

const ASPECT_RATIO = 16/9;
const GAP_BETWEEN_TILES = '10px';
const ACTIVE_SPEAKER_BORDER_RADIUS = '12px';

type PresetName = typeof AFFIRMATIVE | typeof NEGATIVE | typeof JUDGE | typeof SOLO;

const presetColors: { [key in PresetName]: string } = {
    [AFFIRMATIVE]: '#043B6D',
    [NEGATIVE]: '#641316',
    [JUDGE]: '#0D0B0E',
    [SOLO]: '#471a55',
};

const ParticipantTile = React.memo(({
                                        participant,
                                        presetName,
                                        meeting,
                                        isActiveSpeaker,
                                        style,
                                    }: {
    participant: DyteParticipant;
    presetName: PresetName;
    meeting: any;
    isActiveSpeaker: boolean;
    style?: React.CSSProperties;
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
        const videoUpdateListener = () => checkVideoTrack();
        participant.on('videoUpdate', videoUpdateListener);
        return () => {
            participant.off('videoUpdate', videoUpdateListener);
        };
    }, [participant]);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '0',
                paddingBottom: `${(1/ASPECT_RATIO) * 100}%`,
                borderRadius: ACTIVE_SPEAKER_BORDER_RADIUS,
                overflow: 'hidden',
                border: '3px solid',
                borderColor: isActiveSpeaker ? 'white' : 'transparent',
                transition: 'border-color 0.3s ease-in-out',
                ...style,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: ACTIVE_SPEAKER_BORDER_RADIUS,
                    overflow: 'hidden',
                }}
            >
                <DyteParticipantTile
                    participant={participant}
                    meeting={meeting}
                    style={{
                        width: '100%',
                        height: '100%',
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
                    borderRadius: ACTIVE_SPEAKER_BORDER_RADIUS,
                }}>
                    Loading...
                </div>
            )}
        </div>
    );
});

const Logo = () => (
    <img
        src={logo}
        alt="Logo"
        style={{
            maxWidth: '120px',
            maxHeight: '120px',
            objectFit: 'contain',
        }}
    />
);

const renderOneOnOneLayout = (
    negativeParticipant: DyteParticipant,
    affirmativeParticipant: DyteParticipant,
    judgeParticipant: DyteParticipant,
    lastActiveSpeaker: string,
    meeting: any
) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '20px',
            gap: '20px',
        }}>
            <div style={{
                display: 'flex',
                gap: '20px',
                height: '60%',
            }}>
                <div style={{ flex: 1 }}>
                    <ParticipantTile
                        participant={negativeParticipant}
                        presetName={NEGATIVE}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === negativeParticipant.id}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <ParticipantTile
                        participant={affirmativeParticipant}
                        presetName={AFFIRMATIVE}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === affirmativeParticipant.id}
                    />
                </div>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
            }}>
                <div style={{ width: '40%' }}>
                    <ParticipantTile
                        participant={judgeParticipant}
                        presetName={JUDGE}
                        meeting={meeting}
                        isActiveSpeaker={lastActiveSpeaker === judgeParticipant.id}
                    />
                </div>
                <Logo />
            </div>
        </div>
    );
};

const renderTwoJudgesLayout = (
    leftColumnParticipants: DyteParticipant[],
    rightColumnParticipants: DyteParticipant[],
    judgeParticipants: DyteParticipant[],
    lastActiveSpeaker: string,
    meeting: any
) => {
    return (
        <div style={{
            position: 'relative',
            height: '100%',
            padding: '20px',
        }}>
            {/* Top Judge */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '30%',
                right: '30%',
                zIndex: 2,
            }}>
                <ParticipantTile
                    participant={judgeParticipants[0]}
                    presetName={JUDGE}
                    meeting={meeting}
                    isActiveSpeaker={lastActiveSpeaker === judgeParticipants[0].id}
                />
            </div>

            {/* Main Content */}
            <div style={{
                display: 'flex',
                height: '100%',
                paddingTop: '15%',
                paddingBottom: '15%',
                gap: '20px',
            }}>
                <div style={{ flex: 1 }}>
                    {leftColumnParticipants.map((participant) => (
                        <div key={participant.id} style={{ marginBottom: GAP_BETWEEN_TILES }}>
                            <ParticipantTile
                                participant={participant}
                                presetName={participant.presetName as PresetName}
                                meeting={meeting}
                                isActiveSpeaker={lastActiveSpeaker === participant.id}
                            />
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '120px',
                }}>
                    <Logo />
                </div>

                <div style={{ flex: 1 }}>
                    {rightColumnParticipants.map((participant) => (
                        <div key={participant.id} style={{ marginBottom: GAP_BETWEEN_TILES }}>
                            <ParticipantTile
                                participant={participant}
                                presetName={participant.presetName as PresetName}
                                meeting={meeting}
                                isActiveSpeaker={lastActiveSpeaker === participant.id}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Judge */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '30%',
                right: '30%',
                zIndex: 2,
            }}>
                <ParticipantTile
                    participant={judgeParticipants[1]}
                    presetName={JUDGE}
                    meeting={meeting}
                    isActiveSpeaker={lastActiveSpeaker === judgeParticipants[1].id}
                />
            </div>
        </div>
    );
};

const renderDefaultLayout = (
    leftColumnParticipants: DyteParticipant[],
    rightColumnParticipants: DyteParticipant[],
    judgeParticipants: DyteParticipant[],
    lastActiveSpeaker: string,
    meeting: any
) => {
    return (
        <div style={{
            display: 'flex',
            height: '100%',
            padding: '20px',
            gap: '20px',
        }}>
            <div style={{
                width: '33.33%',
                display: 'flex',
                flexDirection: 'column',
                gap: GAP_BETWEEN_TILES,
            }}>
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

            <div style={{
                width: '33.33%',
                display: 'flex',
                flexDirection: 'column',
                gap: GAP_BETWEEN_TILES,
            }}>
                {judgeParticipants.map((participant) => (
                    <div key={participant.id} style={{ marginBottom: GAP_BETWEEN_TILES }}>
                        <ParticipantTile
                            participant={participant}
                            presetName={JUDGE}
                            meeting={meeting}
                            isActiveSpeaker={lastActiveSpeaker === participant.id}
                        />
                    </div>
                ))}
                <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <Logo />
                </div>
            </div>

            <div style={{
                width: '33.33%',
                display: 'flex',
                flexDirection: 'column',
                gap: GAP_BETWEEN_TILES,
            }}>
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
        </div>
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
        const updateParticipants = () => {
            debouncedSetParticipants(() => joinedParticipants);
        };

        updateParticipants();

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

    const getParticipantsByPreset = useCallback((
        presetNames: PresetName | PresetName[]
    ): DyteParticipant[] => {
        const names = Array.isArray(presetNames) ? presetNames : [presetNames];
        return participants.filter(
            (p) => p.presetName && names.includes(p.presetName as PresetName)
        );
    }, [participants]);

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

    const isOneOnOne =
        negativeParticipants.length === 1 &&
        affirmativeParticipants.length === 1 &&
        judgeParticipants.length === 1;

    const hasTwoJudges = judgeParticipants.length === 2;

    return (
        <main style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000',
            color: 'white',
            overflow: 'hidden',
        }}>
            {isOneOnOne ? (
                renderOneOnOneLayout(
                    negativeParticipants[0],
                    affirmativeParticipants[0],
                    judgeParticipants[0],
                    lastActiveSpeaker,
                    meeting
                )
            ) : hasTwoJudges ? (
                renderTwoJudgesLayout(
                    leftColumnParticipants,
                    rightColumnParticipants,
                    judgeParticipants,
                    lastActiveSpeaker,
                    meeting
                )
            ) : (
                renderDefaultLayout(
                    leftColumnParticipants,
                    rightColumnParticipants,
                    judgeParticipants,
                    lastActiveSpeaker,
                    meeting
                )
            )}
            <DyteParticipantsAudio meeting={meeting} />
        </main>
    );
}