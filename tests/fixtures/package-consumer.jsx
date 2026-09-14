/*******************************************************************************
 *
 * This file is part of the LGS1920/timeline project.
 *
 * File: package-consumer.jsx
 *
 * Author : LGS1920 Team
 * email: studio@lgs1920.fr
 *
 * Created on: 2026-09-01
 * Last modified: 2026-09-01
 *
 *
 * Copyright © 2026 LGS1920
 ******************************************************************************/

import '@lgs1920/timeline'
import {LGS1920TimelineReact} from '@lgs1920/timeline/react'

/**
 * Exercise the optional React package export from a consumer entry point.
 *
 * @param {Object} props - Controlled timeline properties.
 * @returns {JSX.Element} Timeline adapter fixture.
 */
export const PackageConsumer = props => <LGS1920TimelineReact {...props}/>
