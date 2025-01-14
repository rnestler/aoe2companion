import {getService, SERVICE_NAME} from "./di";

export type Host = 'aoe2companion' | 'aoe2companion-api' | 'aoe2companion-graphql' | 'aoe2net';
export type OS = 'windows' | 'macos' | 'android' | 'ios' | 'web';
export type Environment = 'development' | 'production';

export interface IHostService {
    getPlatform(): OS;
    getEnvironment(): Environment;
}

export function getHost(host: Host) {
    const hostService = getService(SERVICE_NAME.HOST_SERVICE) as IHostService;
    const platform = hostService.getPlatform();
    const dev = hostService.getEnvironment() == 'development';
    switch (host) {
        case "aoe2companion": {
            // if (__DEV__ && !Constants.isDevice) {
            //     const platformHost = Platform.select({ios: 'localhost', android: '10.0.2.2'});
            //     return `http://${platformHost}:3000/dev/`;
            // }
            // if (__DEV__) {
            //     const platformHost = Constants.isDevice ? '192.168.178.41' : Platform.select({ios: 'localhost', android: '10.0.2.2'});
            //     return `http://${platformHost}:3004/`;
            // }
            // if (__DEV__) {
            //     const platformHost = Constants.isDevice ? '192.168.178.41' : Platform.select({ios: 'localhost', android: '10.0.2.2'});
            //     return `http://${platformHost}:3000/dev/`;
            // }
            // if (dev) {
            //     return 'http://localhost:3333/';
            // }
            return `https://function.aoe2companion.com/`;
        }
        case "aoe2companion-api": {
            // if (__DEV__ && Constants.isDevice) {
            //     const platformHost = '192.168.178.41';
            //     return `http://${platformHost}:3003/`;
            // }
            // if (dev) {
            //     return 'http://localhost:3333/';
            // }
            return `https://api.aoe2companion.com/`;
        }
        case "aoe2companion-graphql": {
            // if (__DEV__ && Constants.isDevice) {
            //     const platformHost = '192.168.178.41';
            //     return `http://${platformHost}:3003/`;
            // }
            // if (dev) {
            //     return 'http://localhost:3333/graphql';
            // }
            return `https://graphql.aoe2companion.com/graphql`;
        }
        case "aoe2net": {
            if (platform === 'web') {
                return 'https://aoe2.net/';
            }
            return `http://aoe2.net/`;
        }
    }
}
