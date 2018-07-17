import { ComponentType, ComponentClass, SFC } from 'react'
import { inject, observer } from 'mobx-react'

export interface IConnectContext {
    [x: string]: any
}

interface IMapStateToProps<I> {
    (state: IConnectContext['state'], nextProps: any): I
}

function connectDecorator<P, R>(
    mapStateToProps: IMapStateToProps<R>,
    component: ComponentClass<P> | SFC<P>
): ComponentClass<Partial<P>> {
    const observerComponent = (component as any).isMobXReactObserver ? component : observer(component)
    return inject(({ state }, nextProps: P) => {
        const props = mapStateToProps(state, nextProps)
        return props
    })(observerComponent) as any
}

interface Connected<R> {
    <P>(component: ComponentClass<P> | SFC<P>): ComponentType<Partial<P>>
    Props?: R
}

export default function connect<R>(mapStateToProps: IMapStateToProps<R>) {
    const connected: Connected<R> = <P>(component: ComponentClass<P> | SFC<P>): ComponentType<Partial<P>> => {
        return connectDecorator(mapStateToProps, component)
    }

    return connected
}
